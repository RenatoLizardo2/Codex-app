-- Add searchVector column for PostgreSQL full-text search
-- This migration is managed manually since Prisma doesn't support tsvector indexes natively.
-- Run via: npx prisma db execute --file prisma/migrations/add_search_vector/migration.sql

ALTER TABLE "Chunk" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

-- GIN index for fast full-text search (@@) queries
CREATE INDEX IF NOT EXISTS "Chunk_searchVector_idx" ON "Chunk" USING GIN ("searchVector");

-- IVFFlat index for cosine similarity search on embeddings
-- lists = 100 is suitable for collections under 1M vectors
CREATE INDEX IF NOT EXISTS "Chunk_embedding_idx" ON "Chunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
