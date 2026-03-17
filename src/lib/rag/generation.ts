// Generation — prompt construction, context formatting, and citation extraction

import { prisma } from "@/src/lib/clients/prisma";
import { geminiModel } from "@/src/lib/clients/gemini";
import { ragConfig } from "@/src/config/rag";
import { generateText } from "ai";

import type { RerankedChunk } from "@/src/types/rag";
import type { Citation } from "@/src/types/database";
import type { ModelMessage } from "ai";

export type GenerationOptions = {
  query: string;
  chunks: RerankedChunk[];
  conversationHistory?: ModelMessage[];
  documentId?: string | null;
};

const SYSTEM_PROMPT_TEMPLATE = `You are the Librarian of The Codex, a wise and knowledgeable assistant who helps users understand their personal document collection. You speak with the warmth and authority of a seasoned scholar.

## Your Role
- Answer questions based on the provided document passages
- Always cite your sources using bracket notation [1], [2], etc.
- If the passages don't contain relevant information, say so honestly
- Never fabricate information not present in the sources
- Be concise but thorough

## Source Passages
{context}

## Citation Rules
- Reference passages using [N] notation inline in your response
- You may cite multiple passages: [1][3]
- Only cite passages that directly support your statement
- If no passages are relevant, state that you couldn't find relevant information in the user's documents`;

const NO_CONTEXT_MESSAGE =
  "No relevant passages were found in your documents. The Librarian will answer based on general knowledge with a disclaimer.";

export function formatChunksForContext(chunks: RerankedChunk[]): string {
  if (chunks.length === 0) return NO_CONTEXT_MESSAGE;

  return chunks
    .map((chunk, index) => {
      const docInfo = chunk.pageNumber
        ? `Document ID: "${chunk.documentId}", Page ${chunk.pageNumber}`
        : `Document ID: "${chunk.documentId}"`;
      return `[${index + 1}] (${docInfo})\n${chunk.content}`;
    })
    .join("\n\n");
}

export function buildSystemPrompt(chunks: RerankedChunk[]): string {
  const context = formatChunksForContext(chunks);
  return SYSTEM_PROMPT_TEMPLATE.replace("{context}", context);
}

export function extractCitations(
  responseText: string,
  chunks: RerankedChunk[]
): Citation[] {
  const bracketPattern = /\[(\d+)\]/g;
  const citedIndices = new Set<number>();
  let match: RegExpExecArray | null;

  while ((match = bracketPattern.exec(responseText)) !== null) {
    const index = parseInt(match[1]!, 10);
    if (index >= 1 && index <= chunks.length) {
      citedIndices.add(index);
    }
  }

  return Array.from(citedIndices).map((index) => {
    const chunk = chunks[index - 1]!;
    return {
      chunkId: chunk.id,
      text: chunk.content.slice(0, 200),
      pageNumber: chunk.pageNumber,
      documentTitle: chunk.documentId,
    };
  });
}

export async function enrichCitationsWithTitles(
  citations: Citation[]
): Promise<Citation[]> {
  if (citations.length === 0) return [];

  const documentIds = [...new Set(citations.map((c) => c.documentTitle))];
  const documents = await prisma.document.findMany({
    where: { id: { in: documentIds } },
    select: { id: true, title: true },
  });

  const titleMap = new Map(documents.map((d) => [d.id, d.title]));

  return citations.map((citation) => ({
    ...citation,
    documentTitle: titleMap.get(citation.documentTitle) ?? "Unknown Document",
  }));
}

export function buildMessagesArray(
  query: string,
  conversationHistory?: ModelMessage[]
): ModelMessage[] {
  const messages: ModelMessage[] = [];

  // Include last 10 messages from conversation history
  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-10);
    messages.push(...recentHistory);
  }

  messages.push({ role: "user", content: query });
  return messages;
}

export async function generateDocumentSummary(
  documentId: string,
  chunks: { content: string; index: number }[]
): Promise<string | null> {
  if (chunks.length === 0) return null;

  try {
    // Select representative chunks: first + evenly spaced, up to 5
    const selectedChunks = selectRepresentativeChunks(chunks, 5);
    const combinedText = selectedChunks
      .map((c) => c.content)
      .join("\n\n---\n\n");

    const { text } = await generateText({
      model: geminiModel,
      maxOutputTokens: ragConfig.generation.maxTokens,
      system:
        "You are a concise document summarizer. Summarize the following document excerpts in 2-3 sentences. Focus on the main topics and key information.",
      messages: [{ role: "user", content: combinedText }],
    });

    await prisma.document.update({
      where: { id: documentId },
      data: { summary: text },
    });

    console.log(
      `[Generation] Summary generated for document ${documentId}`
    );
    return text;
  } catch (error) {
    console.error(
      `[Generation] Summary generation failed for document ${documentId}:`,
      error
    );
    return null;
  }
}

function selectRepresentativeChunks<
  T extends { content: string; index: number },
>(chunks: T[], maxCount: number): T[] {
  if (chunks.length <= maxCount) return chunks;

  const sorted = [...chunks].sort((a, b) => a.index - b.index);
  const selected: T[] = [sorted[0]!];
  const step = (sorted.length - 1) / (maxCount - 1);

  for (let i = 1; i < maxCount; i++) {
    const index = Math.round(step * i);
    const chunk = sorted[index];
    if (chunk) selected.push(chunk);
  }

  return selected;
}
