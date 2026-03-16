// Pipeline — RAG orchestrator: query → embed → retrieve → rerank

import { generateEmbeddings } from "@/src/lib/clients/voyage";
import { hybridSearch } from "@/src/lib/rag/retrieval";
import { rerankChunks } from "@/src/lib/rag/reranking";

import type { RerankedChunk, PipelineOptions } from "@/src/types/rag";

export async function retrieveContext(
  query: string,
  userId: string,
  options?: PipelineOptions
): Promise<RerankedChunk[]> {
  if (!query.trim()) return [];

  const startTime = Date.now();

  // Step 1: Generate query embedding
  const [queryEmbedding] = await generateEmbeddings([query]);
  if (!queryEmbedding) return [];

  // Step 2: Run hybrid search
  const retrievedChunks = await hybridSearch(query, queryEmbedding, {
    userId,
    documentId: options?.documentId,
    topK: options?.topK,
    semanticWeight: options?.semanticWeight,
  });

  if (retrievedChunks.length === 0) {
    console.log(`[Pipeline] Retrieved 0 chunks in ${Date.now() - startTime}ms`);
    return [];
  }

  // Step 3: Rerank results
  const rerankedChunks = await rerankChunks(query, retrievedChunks);

  console.log(
    `[Pipeline] Retrieved ${rerankedChunks.length} chunks in ${Date.now() - startTime}ms`
  );

  return rerankedChunks;
}
