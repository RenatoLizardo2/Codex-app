import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { streamText } from "ai";

import { prisma } from "@/src/lib/clients/prisma";
import { geminiModel } from "@/src/lib/clients/gemini";
import { ragConfig } from "@/src/config/rag";
import { chatRequestSchema } from "@/src/lib/validations/chat";
import { retrieveContext } from "@/src/lib/rag/pipeline";
import {
  buildSystemPrompt,
  buildMessagesArray,
  extractCitations,
  enrichCitationsWithTitles,
} from "@/src/lib/rag/generation";

import type { NextRequest } from "next/server";
import type { ModelMessage } from "ai";

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body: unknown = await request.json();
    const validated = chatRequestSchema.parse(body);

    // Find or create conversation
    let conversationId = validated.conversationId;

    if (conversationId) {
      const existing = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!existing || existing.userId !== user.id) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }
    } else {
      // Auto-title from first message
      const title =
        validated.content.length > 100
          ? validated.content.slice(0, 100) + "..."
          : validated.content;

      const conversation = await prisma.conversation.create({
        data: {
          userId: user.id,
          title,
          documentId: validated.documentId ?? null,
        },
      });

      conversationId = conversation.id;
    }

    // Save user message
    await prisma.message.create({
      data: {
        conversationId,
        role: "user",
        content: validated.content,
        citations: [],
      },
    });

    // Load conversation history (last 10 messages, excluding the one we just saved)
    const historyMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    // Remove the last message (the one we just created) from history for the prompt
    const previousMessages = historyMessages.slice(0, -1);
    const conversationHistory: ModelMessage[] = previousMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Retrieve relevant chunks via RAG pipeline
    const chunks = await retrieveContext(validated.content, user.id, {
      documentId: validated.documentId,
    });

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(chunks);
    const messages = buildMessagesArray(validated.content, conversationHistory);

    // Stream response with Gemini
    const result = streamText({
      model: geminiModel,
      system: systemPrompt,
      messages,
      maxOutputTokens: ragConfig.generation.maxTokens,
      onFinish: async ({ text }) => {
        try {
          // Extract and enrich citations
          const rawCitations = extractCitations(text, chunks);
          const citations = await enrichCitationsWithTitles(rawCitations);

          // Save assistant message with citations
          await prisma.message.create({
            data: {
              conversationId: conversationId!,
              role: "assistant",
              content: text,
              citations: JSON.parse(JSON.stringify(citations)),
            },
          });

          // Update conversation timestamp
          await prisma.conversation.update({
            where: { id: conversationId! },
            data: { updatedAt: new Date() },
          });
        } catch (error) {
          console.error("[Chat] Failed to save assistant message:", error);
        }
      },
    });

    return result.toTextStreamResponse({
      headers: {
        "X-Conversation-Id": conversationId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    console.error("[API] POST /api/chat:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
