// Retrieval — semantic search, full-text search, and hybrid search with score fusion

import { prisma } from "@/src/lib/clients/prisma";
import { ragConfig } from "@/src/config/rag";

import type { RetrievedChunk, SearchOptions, HybridSearchOptions } from "@/src/types/rag";

type RawChunkRow = {
  id: string;
  content: string;
  documentId: string;
  pageNumber: number | null;
  sectionTitle: string | null;
  score: number;
};

export async function semanticSearch(
  queryEmbedding: number[],
  options: SearchOptions
): Promise<RetrievedChunk[]> {
  const topK = options.topK ?? ragConfig.retrieval.topK;
  const embeddingVector = "[" + queryEmbedding.join(",") + "]";
  const documentIdFilter = options.documentId ?? null;

  const rows = await prisma.$queryRaw<RawChunkRow[]>`
    SELECT c.id, c.content, c."documentId", c."pageNumber", c."sectionTitle",
           1 - (c.embedding <=> ${embeddingVector}::vector) as score
    FROM "Chunk" c
    JOIN "Document" d ON c."documentId" = d.id
    WHERE d."userId" = ${options.userId}
      AND (${documentIdFilter}::text IS NULL OR c."documentId" = ${documentIdFilter})
    ORDER BY c.embedding <=> ${embeddingVector}::vector
    LIMIT ${topK}
  `;

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    score: Number(row.score),
    documentId: row.documentId,
    pageNumber: row.pageNumber,
    sectionTitle: row.sectionTitle,
  }));
}

function buildTsQuery(query: string): string {
  const words = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w.replace(/[^\w]/g, ""))
    .filter((w) => w.length > 0);

  if (words.length === 0) return "";
  return words.map((w) => `${w}:*`).join(" & ");
}

export async function fullTextSearch(
  query: string,
  options: SearchOptions
): Promise<RetrievedChunk[]> {
  const tsQuery = buildTsQuery(query);
  if (!tsQuery) return [];

  const topK = options.topK ?? ragConfig.retrieval.topK;
  const documentIdFilter = options.documentId ?? null;

  const rows = await prisma.$queryRaw<RawChunkRow[]>`
    SELECT c.id, c.content, c."documentId", c."pageNumber", c."sectionTitle",
           ts_rank_cd(c."searchVector", to_tsquery('english', ${tsQuery})) as score
    FROM "Chunk" c
    JOIN "Document" d ON c."documentId" = d.id
    WHERE d."userId" = ${options.userId}
      AND (${documentIdFilter}::text IS NULL OR c."documentId" = ${documentIdFilter})
      AND c."searchVector" @@ to_tsquery('english', ${tsQuery})
    ORDER BY score DESC
    LIMIT ${topK}
  `;

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    score: Number(row.score),
    documentId: row.documentId,
    pageNumber: row.pageNumber,
    sectionTitle: row.sectionTitle,
  }));
}

function normalizeScores(chunks: RetrievedChunk[]): RetrievedChunk[] {
  if (chunks.length === 0) return [];
  if (chunks.length === 1) return chunks.map((c) => ({ ...c, score: 1 }));

  const scores = chunks.map((c) => c.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore;

  if (range === 0) return chunks.map((c) => ({ ...c, score: 1 }));

  return chunks.map((c) => ({
    ...c,
    score: (c.score - minScore) / range,
  }));
}

export async function hybridSearch(
  query: string,
  queryEmbedding: number[],
  options: HybridSearchOptions
): Promise<RetrievedChunk[]> {
  const semanticWeight =
    options.semanticWeight ?? ragConfig.retrieval.semanticWeight;
  const keywordWeight =
    options.keywordWeight ?? ragConfig.retrieval.keywordWeight;
  const topK = options.topK ?? ragConfig.retrieval.topK;

  const searchOptions: SearchOptions = {
    userId: options.userId,
    documentId: options.documentId,
    // Fetch more than topK from each to improve fusion quality
    topK: topK * 2,
  };

  const [semanticResults, keywordResults] = await Promise.all([
    semanticSearch(queryEmbedding, searchOptions),
    fullTextSearch(query, searchOptions),
  ]);

  // Normalize scores within each result set to 0-1
  const normalizedSemantic = normalizeScores(semanticResults);
  const normalizedKeyword = normalizeScores(keywordResults);

  // Combine and deduplicate by chunk ID
  const scoreMap = new Map<string, RetrievedChunk & { combinedScore: number }>();

  for (const chunk of normalizedSemantic) {
    const existing = scoreMap.get(chunk.id);
    const weightedScore = semanticWeight * chunk.score;

    if (existing) {
      existing.combinedScore += weightedScore;
    } else {
      scoreMap.set(chunk.id, {
        ...chunk,
        score: weightedScore,
        combinedScore: weightedScore,
      });
    }
  }

  for (const chunk of normalizedKeyword) {
    const existing = scoreMap.get(chunk.id);
    const weightedScore = keywordWeight * chunk.score;

    if (existing) {
      existing.combinedScore += weightedScore;
    } else {
      scoreMap.set(chunk.id, {
        ...chunk,
        score: weightedScore,
        combinedScore: weightedScore,
      });
    }
  }

  // Sort by combined score and return top-K
  return Array.from(scoreMap.values())
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, topK)
    .map(({ combinedScore, ...chunk }) => ({
      ...chunk,
      score: combinedScore,
    }));
}
