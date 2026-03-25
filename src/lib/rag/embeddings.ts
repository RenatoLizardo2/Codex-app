// Embeddings — batch generation, pgvector storage, and search vector setup

import crypto from "crypto";

import { generateEmbeddings } from "@/src/lib/clients/voyage";
import { prisma } from "@/src/lib/clients/prisma";

import type { TextChunk, EmbeddedChunk } from "@/src/types/rag";

export const VOYAGE_BATCH_SIZE = 128;

export async function generateChunkEmbeddings(
  chunks: TextChunk[]
): Promise<EmbeddedChunk[]> {
  if (chunks.length === 0) return [];

  const contents = chunks.map((c) => c.content);
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < contents.length; i += VOYAGE_BATCH_SIZE) {
    const batchIndex = Math.floor(i / VOYAGE_BATCH_SIZE);
    const batch = contents.slice(i, i + VOYAGE_BATCH_SIZE);

    try {
      const embeddings = await generateEmbeddings(batch);
      allEmbeddings.push(...embeddings);
    } catch (error) {
      throw new Error(
        `[Embeddings] Failed to generate embeddings for batch ${batchIndex}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return chunks.map((chunk, i) => ({
    ...chunk,
    embedding: allEmbeddings[i]!,
  }));
}

export async function storeChunksWithEmbeddings(
  documentId: string,
  chunks: EmbeddedChunk[]
): Promise<number> {
  if (chunks.length === 0) return 0;

  await prisma.$transaction(
    async (tx) => {
      // Delete existing chunks for idempotent re-indexing
      await tx.chunk.deleteMany({ where: { documentId } });

      // Insert each chunk with raw SQL for pgvector support
      for (const chunk of chunks) {
        const id = crypto.randomUUID();
        const embeddingVector = "[" + chunk.embedding.join(",") + "]";

        await tx.$executeRaw`
          INSERT INTO "Chunk" (id, "documentId", content, embedding, "chunkIndex", "pageNumber", "sectionTitle", "tokenCount", metadata)
          VALUES (${id}, ${documentId}, ${chunk.content}, ${embeddingVector}::vector, ${chunk.index}, ${chunk.pageNumber}, ${chunk.sectionTitle}, ${chunk.tokenCount}, '{}'::jsonb)
        `;
      }

      // Update document total chunk count
      await tx.document.update({
        where: { id: documentId },
        data: { totalChunks: chunks.length },
      });
    },
    { maxWait: 10000, timeout: 60000 }
  );

  return chunks.length;
}

export async function updateSearchVectors(
  documentId: string
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "Chunk" SET "searchVector" = to_tsvector('english', content)
    WHERE "documentId" = ${documentId}
  `;
}
