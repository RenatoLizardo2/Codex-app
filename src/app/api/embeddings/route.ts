import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/src/lib/clients/prisma";
import { getOrCreateUser } from "@/src/lib/auth/get-or-create-user";
import { triggerEmbeddingsSchema } from "@/src/lib/validations/rag";
import { chunkText } from "@/src/lib/rag/chunking";
import {
  generateChunkEmbeddings,
  storeChunksWithEmbeddings,
  updateSearchVectors,
} from "@/src/lib/rag/embeddings";
import { generateDocumentSummary } from "@/src/lib/rag/generation";

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const authResult = await getOrCreateUser();

    if (authResult.error) {
      const status = authResult.error === "unauthorized" ? 401 : 500;
      return NextResponse.json({ error: authResult.error }, { status });
    }

    const user = authResult.user;

    const body: unknown = await request.json();
    const validated = triggerEmbeddingsSchema.parse(body);

    const document = await prisma.document.findUnique({
      where: { id: validated.documentId },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    if (document.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (document.status !== "ready" || !document.extractedText) {
      return NextResponse.json(
        { error: "Document has no extracted text to index" },
        { status: 400 }
      );
    }

    // Mark as processing during re-indexing
    await prisma.document.update({
      where: { id: document.id },
      data: { status: "processing" },
    });

    try {
      const chunks = chunkText(document.extractedText);
      const embeddedChunks = await generateChunkEmbeddings(chunks);
      const totalChunks = await storeChunksWithEmbeddings(
        document.id,
        embeddedChunks
      );
      await updateSearchVectors(document.id);

      await prisma.document.update({
        where: { id: document.id },
        data: { status: "ready", totalChunks },
      });

      // Non-blocking auto-summary generation
      generateDocumentSummary(document.id, chunks).catch((err) => {
        console.error("[Embeddings] Auto-summary failed (non-blocking):", err);
      });

      return NextResponse.json({
        data: {
          documentId: document.id,
          totalChunks,
          status: "ready",
        },
      });
    } catch (indexError) {
      console.error("[Embeddings] Indexing pipeline failed:", indexError);

      await prisma.document.update({
        where: { id: document.id },
        data: { status: "error" },
      });

      return NextResponse.json(
        { error: "Failed to index document" },
        { status: 500 }
      );
    }
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

    console.error("[API] POST /api/embeddings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
