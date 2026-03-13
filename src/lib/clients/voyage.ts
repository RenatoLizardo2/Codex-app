// Voyage AI client — embeddings generation and reranking

// Direct CJS import — voyageai ESM has broken internal directory imports
// that Turbopack cannot resolve
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { VoyageAIClient } = require("voyageai") as typeof import("voyageai");

function getClient() {
  const apiKey = process.env.VOYAGE_API_KEY;

  if (!apiKey) {
    throw new Error("[Voyage] Missing VOYAGE_API_KEY environment variable");
  }

  return new VoyageAIClient({ apiKey });
}

export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const client = getClient();

  const response = await client.embed({
    input: texts,
    model: "voyage-3-lite",
  });

  if (!response.data) {
    throw new Error("[Voyage] No embedding data returned");
  }

  return response.data.map((item) => {
    if (!item.embedding) {
      throw new Error("[Voyage] Missing embedding in response item");
    }
    return item.embedding;
  });
}

export type RerankResult = {
  index: number;
  relevanceScore: number;
  document: string;
};

export async function rerankDocuments(
  query: string,
  documents: string[]
): Promise<RerankResult[]> {
  const client = getClient();

  const response = await client.rerank({
    query,
    documents,
    model: "rerank-2-lite",
  });

  if (!response.data) {
    throw new Error("[Voyage] No rerank data returned");
  }

  return response.data.map((item) => ({
    index: item.index ?? 0,
    relevanceScore: item.relevanceScore ?? 0,
    document: documents[item.index ?? 0] ?? "",
  }));
}
