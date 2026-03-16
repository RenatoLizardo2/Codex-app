// Reranking — reorder retrieved chunks using Voyage Rerank for improved precision

import { rerankDocuments } from "@/src/lib/clients/voyage";
import { ragConfig } from "@/src/config/rag";

import type { RetrievedChunk, RerankedChunk } from "@/src/types/rag";

export async function rerankChunks(
  query: string,
  chunks: RetrievedChunk[]
): Promise<RerankedChunk[]> {
  if (chunks.length === 0) return [];

  const topN = ragConfig.reranking.topN;

  try {
    const contents = chunks.map((c) => c.content);
    const results = await rerankDocuments(query, contents);

    const reranked: RerankedChunk[] = results.map((result) => {
      const originalChunk = chunks[result.index]!;
      return {
        ...originalChunk,
        rerankScore: result.relevanceScore,
      };
    });

    return reranked
      .sort((a, b) => b.rerankScore - a.rerankScore)
      .slice(0, topN);
  } catch (error) {
    // Graceful fallback: return original chunks with hybrid score as rerankScore
    console.warn("[Reranking] Voyage rerank failed, using fallback:", error);

    return chunks
      .map((chunk) => ({
        ...chunk,
        rerankScore: chunk.score,
      }))
      .sort((a, b) => b.rerankScore - a.rerankScore)
      .slice(0, topN);
  }
}
