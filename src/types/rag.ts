// RAG types — chunks, embeddings, and pipeline types

export type ParsedDocument = {
  content: string;
  metadata: {
    title?: string;
    pageCount?: number;
    sections?: string[];
  };
};

export type TextChunk = {
  content: string;
  index: number;
  pageNumber: number | null;
  sectionTitle: string | null;
  tokenCount: number;
};

export type EmbeddedChunk = TextChunk & {
  embedding: number[];
};

export type RetrievedChunk = {
  id: string;
  content: string;
  score: number;
  documentId: string;
  pageNumber: number | null;
  sectionTitle: string | null;
};

export type RerankedChunk = RetrievedChunk & {
  rerankScore: number;
};

export type SearchOptions = {
  userId: string;
  documentId?: string | null;
  topK?: number;
};

export type HybridSearchOptions = SearchOptions & {
  semanticWeight?: number;
  keywordWeight?: number;
};

export type PipelineOptions = {
  topK?: number;
  semanticWeight?: number;
  documentId?: string | null;
};
