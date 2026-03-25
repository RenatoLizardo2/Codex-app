// RAG config — chunking, retrieval, and pipeline configuration

export const ragConfig = {
  chunking: {
    maxTokens: 500,
    minTokens: 200,
    overlapPercentage: 0.1, // 10-15% overlap
  },
  retrieval: {
    topK: 10,
    semanticWeight: 0.7,
    keywordWeight: 0.3,
  },
  reranking: {
    topN: 5, // Number of chunks after reranking
  },
  embedding: {
    model: "voyage-3-lite",
    dimensions: 512,
  },
  generation: {
    model: "gemini-2.5-flash",
    maxTokens: 5048,
  },
} as const;
