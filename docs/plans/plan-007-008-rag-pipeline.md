## Feature: Chunking, Embeddings, Search & Retrieval (RAG Pipeline)

File: docs/plans/plan-007-008-rag-pipeline.md
Issues: 007-chunking-and-embeddings, 008-search-and-retrieval
Date: 2026-03-13
Phase: 2
Status: Done

### Objective

Implement the complete RAG indexing and retrieval pipeline: semantic chunking of extracted document text (200-500 tokens, 10-15% overlap, metadata preservation), batch embedding generation via Voyage AI (voyage-3-lite, 1024 dimensions), pgvector storage with chunk records, and an `/api/embeddings` endpoint to trigger document indexing with status management.

Then implement hybrid search (cosine similarity via pgvector + PostgreSQL full-text search, 0.7/0.3 weighting), Voyage reranking of retrieved chunks, a RAG pipeline orchestrator (query → embed → retrieve → rerank → return top-K), and the `/api/search` endpoint.

After this, uploaded documents are automatically chunked and indexed, and users can search across their documents with high-quality hybrid retrieval. The full pipeline is ready for chat/generation in Phase 3.

---

### Sub-tasks

#### Issue 007 — Chunking & Embeddings (Backend)

- [x] **T1: Add Zod validation schemas for embeddings and search** — Criteria: `src/lib/validations/rag.ts` exports `triggerEmbeddingsSchema` (validates `{ documentId: z.string().min(1) }`) and `searchQuerySchema` (validates `{ query: z.string().min(1).max(2000), documentId: z.string().optional(), topK: z.number().int().min(1).max(50).optional() }`). Types derived via `z.infer`. No `export default`.

- [x] **T2: Implement token estimation utility** — Criteria: `src/lib/utils/tokens.ts` exports a pure function `estimateTokenCount(text: string): number` that estimates token count using the ~4 characters per token heuristic (divide by 4, round up). Also exports `splitIntoSentences(text: string): string[]` that splits text by sentence-ending punctuation (`.`, `!`, `?` followed by whitespace or end) while handling abbreviations and decimals gracefully. No external tokenizer dependency — this keeps the bundle small and is accurate enough for chunking boundaries. No `export default`.

- [x] **T3: Implement semantic chunking engine** — Criteria: `src/lib/rag/chunking.ts` exports `chunkText(text: string, options?: ChunkingOptions): TextChunk[]`. The function:
  1. Splits text into paragraphs by double newlines (`\n\n`)
  2. For each paragraph, estimates token count via `estimateTokenCount()`
  3. Merges small paragraphs into chunks targeting `minTokens`-`maxTokens` range (defaults from `ragConfig.chunking`)
  4. Splits oversized paragraphs by sentences, grouping sentences into chunks within token limits
  5. Applies overlap: repeats the last ~10% of tokens from the previous chunk at the start of the next chunk (overlap percentage from `ragConfig.chunking.overlapPercentage`)
  6. Preserves metadata per chunk: `index` (sequential), `pageNumber` (from `\f` form feed characters in PDF text, null if not applicable), `sectionTitle` (from the most recent Markdown heading `#` before the chunk, null if none), `tokenCount`
  7. Returns empty array for empty/whitespace-only input
  8. No `any` types. Pure function, no side effects. Uses `ragConfig` for defaults but accepts overrides.

  Also exports type `ChunkingOptions = { maxTokens?: number; minTokens?: number; overlapPercentage?: number; }`.

- [x] **T4: Implement batch embedding generation** — Criteria: `src/lib/rag/embeddings.ts` exports `generateChunkEmbeddings(chunks: TextChunk[]): Promise<EmbeddedChunk[]>`. The function:
  1. Extracts content strings from chunks
  2. Batches into groups of `VOYAGE_BATCH_SIZE` (128 max per Voyage API call)
  3. Calls `generateEmbeddings()` from `@/src/lib/clients/voyage` for each batch
  4. Merges embeddings back onto chunks, producing `EmbeddedChunk[]`
  5. Handles empty chunks array (returns `[]`)
  6. On Voyage API error, throws with context: `"[Embeddings] Failed to generate embeddings for batch N: <error>"`
  7. Exports constant `VOYAGE_BATCH_SIZE = 128`
  No `export default`.

- [x] **T5: Implement pgvector chunk storage** — Criteria: `src/lib/rag/embeddings.ts` also exports `storeChunksWithEmbeddings(documentId: string, chunks: EmbeddedChunk[]): Promise<number>`. The function:
  1. Deletes existing chunks for the document (idempotent re-indexing): `prisma.chunk.deleteMany({ where: { documentId } })`
  2. Inserts each chunk as a Chunk record using raw SQL via `prisma.$executeRaw` (because Prisma does not natively support pgvector `vector` type for inserts). The raw SQL: `INSERT INTO "Chunk" (id, "documentId", content, embedding, "chunkIndex", "pageNumber", "sectionTitle", "tokenCount", metadata) VALUES ($1, $2, $3, $4::vector, $5, $6, $7, $8, $9)`
  3. Generates CUID for each chunk ID (use `crypto.randomUUID()` or a cuid generator — prefer `crypto.randomUUID()` for simplicity since Prisma uses cuid by default but raw SQL needs explicit IDs)
  4. Updates the document's `totalChunks` count: `prisma.document.update({ where: { id: documentId }, data: { totalChunks: chunks.length } })`
  5. Returns the number of chunks stored
  6. Wraps operations in a transaction for atomicity
  No `export default`.

- [x] **T6: Implement full-text search vector setup** — Criteria: `src/lib/rag/embeddings.ts` also exports `updateSearchVectors(documentId: string): Promise<void>`. The function executes raw SQL to update the `tsvector` column for full-text search:
  ```sql
  UPDATE "Chunk" SET "searchVector" = to_tsvector('english', content) WHERE "documentId" = $1
  ```
  This requires adding a `searchVector` column to the Chunk model (see T7).

- [x] **T7: Add searchVector column and GIN index to Chunk model** — Criteria: Modify `prisma/schema.prisma` to add:
  1. `searchVector` field on Chunk: `Unsupported("tsvector")?` (nullable, populated after insert)
  2. Add a comment noting the GIN index must be created via raw migration since Prisma doesn't support `tsvector` indexes natively

  Create a SQL migration file `prisma/migrations/add_search_vector/migration.sql` with:
  ```sql
  ALTER TABLE "Chunk" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;
  CREATE INDEX IF NOT EXISTS "Chunk_searchVector_idx" ON "Chunk" USING GIN ("searchVector");
  CREATE INDEX IF NOT EXISTS "Chunk_embedding_idx" ON "Chunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
  ```
  The IVFFlat index on embeddings dramatically improves cosine similarity search performance.

  **Note:** Since Prisma doesn't manage `Unsupported` types well in migrations, these columns/indexes will be managed via raw SQL. The Prisma schema documents them for reference but actual creation is via the migration SQL.

- [x] **T8: Implement POST /api/embeddings endpoint** — Criteria: `src/app/api/embeddings/route.ts` exports `POST` handler. Flow:
  1. Auth: `auth()` from Clerk — reject 401 if no userId
  2. Look up user by clerkId
  3. Validate body with `triggerEmbeddingsSchema`
  4. Fetch document by ID, verify ownership (403 if not owner)
  5. Verify document has `status: "ready"` and non-empty `extractedText` (400 if not)
  6. Update document status to `"processing"` (indicates re-indexing)
  7. Run the indexing pipeline:
     a. `chunkText(document.extractedText)` → `TextChunk[]`
     b. `generateChunkEmbeddings(chunks)` → `EmbeddedChunk[]`
     c. `storeChunksWithEmbeddings(documentId, embeddedChunks)` → chunk count
     d. `updateSearchVectors(documentId)` — populate tsvector
  8. Update document status to `"ready"` and `totalChunks`
  9. On error: update document status to `"error"`, log error, return 500
  10. Response: `{ data: { documentId, totalChunks, status: "ready" } }` with status 200
  Error responses use `{ error: "message" }` envelope.

- [x] **T9: Integrate indexing into document upload flow** — Criteria: Modify `src/app/api/documents/route.ts` POST handler. After text extraction succeeds (status → "ready"), automatically trigger the indexing pipeline (chunking → embeddings → storage → search vectors). The flow becomes:
  1. Upload file / fetch URL
  2. Extract text → store in `extractedText`
  3. Chunk text → generate embeddings → store in pgvector → update search vectors
  4. Update status to "ready" with `totalChunks`

  If indexing fails, the document still has its extracted text and status "ready" — indexing can be retried via `/api/embeddings`. Log the error but don't fail the upload. This makes the upload flow resilient: text extraction is critical, embedding generation is retryable.

  Import and call the functions from `src/lib/rag/embeddings.ts` and `src/lib/rag/chunking.ts`.

#### Issue 008 — Search & Retrieval (Backend)

- [x] **T10: Implement semantic search (pgvector cosine similarity)** — Criteria: `src/lib/rag/retrieval.ts` exports `semanticSearch(queryEmbedding: number[], options: SearchOptions): Promise<RetrievedChunk[]>`. The function:
  1. Executes raw SQL against pgvector:
     ```sql
     SELECT c.id, c.content, c."documentId", c."pageNumber", c."sectionTitle",
            1 - (c.embedding <=> $1::vector) as score
     FROM "Chunk" c
     JOIN "Document" d ON c."documentId" = d.id
     WHERE d."userId" = $2
       AND ($3::text IS NULL OR c."documentId" = $3)
     ORDER BY c.embedding <=> $1::vector
     LIMIT $4
     ```
  2. The `<=>` operator computes cosine distance; `1 - distance` gives similarity score (0-1)
  3. Filters by userId (security: only search own documents) and optionally by documentId
  4. Returns `RetrievedChunk[]` sorted by descending score
  5. Accepts `SearchOptions = { userId: string; documentId?: string | null; topK?: number }`
  No `export default`.

- [x] **T11: Implement full-text search (PostgreSQL tsvector/tsquery)** — Criteria: `src/lib/rag/retrieval.ts` also exports `fullTextSearch(query: string, options: SearchOptions): Promise<RetrievedChunk[]>`. The function:
  1. Converts the query to tsquery format: split words, join with `&` (AND), wrap each word with `:*` for prefix matching
  2. Executes raw SQL:
     ```sql
     SELECT c.id, c.content, c."documentId", c."pageNumber", c."sectionTitle",
            ts_rank_cd(c."searchVector", to_tsquery('english', $1)) as score
     FROM "Chunk" c
     JOIN "Document" d ON c."documentId" = d.id
     WHERE d."userId" = $2
       AND ($3::text IS NULL OR c."documentId" = $3)
       AND c."searchVector" @@ to_tsquery('english', $1)
     ORDER BY score DESC
     LIMIT $4
     ```
  3. `ts_rank_cd` scores chunks by text relevance
  4. Returns `RetrievedChunk[]` sorted by descending score
  5. Handles empty/invalid queries gracefully (return `[]`)
  No `export default`.

- [x] **T12: Implement hybrid search with score fusion** — Criteria: `src/lib/rag/retrieval.ts` also exports `hybridSearch(query: string, queryEmbedding: number[], options: HybridSearchOptions): Promise<RetrievedChunk[]>`. The function:
  1. Runs `semanticSearch` and `fullTextSearch` in parallel (`Promise.all`)
  2. Normalizes scores within each result set to 0-1 range (min-max normalization)
  3. Combines results with weighted score: `finalScore = semanticWeight * semanticScore + keywordWeight * keywordScore` (defaults: 0.7/0.3 from `ragConfig.retrieval`)
  4. Deduplicates by chunk ID (if a chunk appears in both results, sum the weighted scores)
  5. Sorts by combined score descending
  6. Returns top-K results (default from `ragConfig.retrieval.topK`)
  7. Accepts `HybridSearchOptions = SearchOptions & { semanticWeight?: number; keywordWeight?: number }`
  No `export default`.

- [x] **T13: Implement Voyage reranking wrapper** — Criteria: `src/lib/rag/reranking.ts` exports `rerankChunks(query: string, chunks: RetrievedChunk[]): Promise<RerankedChunk[]>`. The function:
  1. If chunks is empty, return `[]`
  2. Extracts content strings from chunks
  3. Calls `rerankDocuments(query, contents)` from `@/src/lib/clients/voyage`
  4. Maps rerank results back to chunks, adding `rerankScore` field
  5. Sorts by `rerankScore` descending
  6. Returns top-N results (default from `ragConfig.reranking.topN`, typically 5)
  7. On Voyage API error, log warning and return original chunks with `rerankScore = score` (fallback gracefully — reranking is an enhancement, not critical)
  No `export default`.

- [x] **T14: Implement RAG pipeline orchestrator** — Criteria: `src/lib/rag/pipeline.ts` exports `retrieveContext(query: string, userId: string, options?: PipelineOptions): Promise<RerankedChunk[]>`. The function orchestrates the full retrieval flow:
  1. Generate query embedding: `generateEmbeddings([query])` → single embedding vector
  2. Run hybrid search: `hybridSearch(query, queryEmbedding, { userId, documentId, topK: options?.topK })`
  3. Rerank results: `rerankChunks(query, retrievedChunks)`
  4. Return reranked chunks
  5. Handles empty query (return `[]`), no results found (return `[]`)
  6. Logs pipeline timing: `console.log("[Pipeline] Retrieved N chunks in Xms")`
  No `export default`. The `generation.ts` stub is NOT implemented in this issue (deferred to issue 009).

- [x] **T15: Implement POST /api/search endpoint** — Criteria: `src/app/api/search/route.ts` exports `POST` handler. Flow:
  1. Auth: `auth()` from Clerk — reject 401 if no userId
  2. Look up user by clerkId
  3. Validate body with `searchQuerySchema`
  4. Call `retrieveContext(query, userId, { documentId, topK })`
  5. Response: `{ data: { chunks: RerankedChunk[], query, totalResults: number } }` with status 200
  6. Empty results: return `{ data: { chunks: [], query, totalResults: 0 } }` with 200 (not a 404)
  Error responses use `{ error: "message" }` envelope.

- [x] **T16: Add RAG pipeline types to rag.ts** — Criteria: Update `src/types/rag.ts` to add missing types needed by the implementation:
  1. `ChunkingOptions` type (if not co-located with chunking.ts)
  2. `SearchOptions = { userId: string; documentId?: string | null; topK?: number }`
  3. `HybridSearchOptions = SearchOptions & { semanticWeight?: number; keywordWeight?: number }`
  4. Verify existing types (`TextChunk`, `EmbeddedChunk`, `RetrievedChunk`, `RerankedChunk`, `PipelineOptions`) align with implementation needs. Update if needed.
  No `export default`.

---

### Data Flow

#### Issue 007 — Chunking & Embeddings (Indexing Pipeline)

```
Document Upload (POST /api/documents)
  → extractText(fileType, content) → ParsedDocument { content, metadata }
  → document.extractedText = content, status = "ready"
  → [Automatic indexing]:
      chunkText(extractedText) → TextChunk[]
        → split by \n\n paragraphs
        → merge small paragraphs / split large ones by sentences
        → apply 10% overlap between adjacent chunks
        → annotate: index, pageNumber (from \f), sectionTitle (from #), tokenCount
      generateChunkEmbeddings(chunks) → EmbeddedChunk[]
        → batch 128 chunks per Voyage API call
        → voyage-3-lite → 1024-dim vectors
      storeChunksWithEmbeddings(documentId, embeddedChunks)
        → DELETE existing chunks (idempotent)
        → INSERT via raw SQL with ::vector cast
        → UPDATE document.totalChunks
      updateSearchVectors(documentId)
        → UPDATE Chunk SET searchVector = to_tsvector('english', content)
  → document.status = "ready", totalChunks = N

Manual re-indexing (POST /api/embeddings):
  → auth() → validate { documentId } → verify ownership
  → verify document.status === "ready" && extractedText
  → same pipeline as above
  → Response: { data: { documentId, totalChunks, status } }
```

#### Issue 008 — Search & Retrieval (Query Pipeline)

```
POST /api/search { query, documentId?, topK? }
  → auth() → validate → user lookup
  → retrieveContext(query, userId, options)
      │
      ├─ Step 1: Embed query
      │  generateEmbeddings([query]) → number[1024]
      │
      ├─ Step 2: Hybrid search (parallel)
      │  ├─ semanticSearch(queryEmbedding, options)
      │  │   → SELECT ... 1 - (embedding <=> $1::vector) as score
      │  │   → ORDER BY embedding <=> $1::vector LIMIT topK
      │  │   → RetrievedChunk[] (semantic scores 0-1)
      │  │
      │  └─ fullTextSearch(query, options)
      │      → to_tsquery('english', 'word1 & word2:*')
      │      → SELECT ... ts_rank_cd(searchVector, tsquery) as score
      │      → WHERE searchVector @@ tsquery
      │      → RetrievedChunk[] (keyword scores)
      │
      ├─ Step 3: Score fusion
      │  → normalize scores per result set (min-max → 0-1)
      │  → combined = 0.7 * semantic + 0.3 * keyword
      │  → deduplicate by chunk ID (sum weighted scores)
      │  → sort by combined score DESC, take top-K
      │
      └─ Step 4: Rerank
         rerankChunks(query, topK chunks)
           → Voyage Rerank API (rerank-2-lite)
           → RerankedChunk[] with rerankScore
           → top-N (default 5) by rerankScore

  → Response: { data: { chunks, query, totalResults } }

Future (issue 009): retrieveContext() output → Gemini Flash → streaming response with citations
```

---

### Files to Create/Modify

#### Issue 007

| File | Action | Description |
|------|--------|-------------|
| `src/lib/validations/rag.ts` | Create | Zod schemas: triggerEmbeddingsSchema, searchQuerySchema |
| `src/lib/utils/tokens.ts` | Create | Token estimation and sentence splitting utilities |
| `src/lib/rag/chunking.ts` | Modify | Semantic chunking engine with overlap and metadata |
| `src/lib/rag/embeddings.ts` | Modify | Batch embedding generation, pgvector storage, search vector setup |
| `prisma/schema.prisma` | Modify | Add searchVector field to Chunk model |
| `prisma/migrations/add_search_vector/migration.sql` | Create | SQL: add searchVector column, GIN index, IVFFlat embedding index |
| `src/app/api/embeddings/route.ts` | Modify | POST handler: trigger document indexing pipeline |
| `src/app/api/documents/route.ts` | Modify | Integrate automatic indexing after text extraction |
| `src/types/rag.ts` | Modify | Add ChunkingOptions, SearchOptions, HybridSearchOptions types |

#### Issue 008

| File | Action | Description |
|------|--------|-------------|
| `src/lib/rag/retrieval.ts` | Modify | Semantic search, full-text search, hybrid search with score fusion |
| `src/lib/rag/reranking.ts` | Modify | Voyage reranking wrapper with graceful fallback |
| `src/lib/rag/pipeline.ts` | Modify | RAG orchestrator: embed → retrieve → rerank |
| `src/app/api/search/route.ts` | Modify | POST handler: hybrid search endpoint |

---

### Decisions

1. **Token estimation via character count (~4 chars/token)** — Using a full tokenizer (like tiktoken or gpt-tokenizer) would add a heavy dependency and is model-specific. The ~4 characters per token heuristic is standard for English text and accurate enough for chunking boundaries. The exact token count doesn't need to be precise — it determines chunk size ranges, not billing.

2. **Raw SQL for pgvector operations** — Prisma does not natively support the `vector` type for inserts or cosine distance queries (`<=>` operator). Using `prisma.$executeRaw` and `prisma.$queryRaw` gives full control over vector operations. This is the standard approach in Prisma + pgvector projects. The trade-off is losing type safety on these queries, mitigated by careful testing.

3. **IVFFlat index over HNSW for embeddings** — IVFFlat is simpler, uses less memory, and performs well for collections under 1M vectors. HNSW provides better recall at scale but requires more memory — overkill for a portfolio project on free tier. IVFFlat with `lists = 100` is a good default that can be tuned later.

4. **Automatic indexing on upload, retryable via /api/embeddings** — Indexing is triggered automatically after text extraction succeeds in the upload flow. If it fails, the document still has its extracted text and "ready" status. The `/api/embeddings` endpoint allows manual re-indexing. This makes the system resilient: upload never fails due to embedding issues.

5. **Synchronous indexing in the request handler** — For a portfolio project on free tier with low concurrency, running the chunking → embedding → storage pipeline synchronously in the API handler is acceptable. Background job infrastructure (Bull, Inngest, etc.) would add complexity. The trade-off: large documents may take 5-10 seconds to index. The client already has polling (from issue 006's `useDocumentStatus`).

6. **searchVector as a separate column + GIN index** — PostgreSQL full-text search requires a `tsvector` column. We store it on the Chunk table and update it after chunk insertion. The GIN index makes `@@` queries fast. Alternative: compute tsvector on-the-fly in queries — rejected because GIN indexing requires a stored column for optimal performance.

7. **Score normalization before fusion** — Semantic search returns cosine similarity (0-1) and full-text returns `ts_rank_cd` (unbounded). Without normalization, the keyword scores would be meaningless relative to semantic scores. Min-max normalization within each result set ensures both contribute proportionally to the 0.7/0.3 weighted combination.

8. **Reranking fallback on error** — If Voyage Rerank API fails (network error, rate limit), the pipeline falls back to using the hybrid search scores directly. This prevents the search from failing completely when reranking is unavailable. Reranking improves precision but isn't critical for basic retrieval.

9. **Overlap applied at paragraph boundaries** — Overlap tokens are taken from the end of the previous chunk's last paragraph, not from the middle of a sentence. This produces more natural chunk boundaries and avoids splitting words. The overlap percentage (10%) is applied to the target chunk size.

10. **Combined issues 007 + 008 on one branch** — The chunking/embedding pipeline (007) produces the indexed data that search/retrieval (008) consumes. They form a complete vertical slice of the RAG pipeline. Single branch `feat/007-008-rag-pipeline` reduces overhead.

11. **crypto.randomUUID() for raw SQL chunk IDs** — Prisma's `@default(cuid())` only works through the Prisma client. Since we use raw SQL for chunk inserts (to support vector type), we need explicit IDs. `crypto.randomUUID()` is built-in to Node.js, requires no dependency, and produces unique IDs. The format differs from CUID but is equally valid as a primary key.

12. **No generation module in this phase** — `src/lib/rag/generation.ts` remains a stub. The pipeline orchestrator returns `RerankedChunk[]` that will be consumed by the generation module in issue 009. This keeps the scope focused on indexing and retrieval.

---

### Edge Cases

- **Empty extractedText** — If a document has empty `extractedText` (e.g., image-only PDF), `chunkText("")` returns `[]`, and no chunks are stored. The document's `totalChunks` stays 0. The `/api/embeddings` endpoint returns 400 if `extractedText` is empty/null.
- **Very long documents** — A document with 100K+ tokens will produce 200+ chunks. Voyage AI batching (128 per call) handles this — 2 API calls. The raw SQL inserts are individual per chunk within a transaction. If memory is a concern, the batching already limits peak memory to 128 embeddings at a time.
- **Very short documents** — A document with <200 tokens produces a single chunk (below `minTokens`). The chunking engine accepts any non-empty content.
- **Unicode and special characters** — Token estimation using character count works for Latin scripts but overestimates for CJK characters (which encode ~1 token per character). Acceptable trade-off for an English-focused portfolio project. The chunking and search pipelines handle UTF-8 correctly through PostgreSQL and Voyage AI.
- **Re-indexing an already indexed document** — `storeChunksWithEmbeddings` deletes existing chunks first (idempotent). This handles the case where a user triggers `/api/embeddings` on an already-indexed document, or the upload flow runs indexing again.
- **Voyage API rate limits** — Voyage's free tier has generous limits. If a rate limit is hit during batch embedding, the error propagates and the document indexing fails. The document remains with `extractedText` and can be re-indexed later via `/api/embeddings`.
- **No search results** — `hybridSearch` returns `[]` when no chunks match. The API returns 200 with `{ chunks: [], totalResults: 0 }`. The client handles empty state.
- **Search query with no indexed documents** — The user has documents but none are indexed (all have `totalChunks: 0`). Semantic search returns `[]` because no embeddings exist. Full-text search returns `[]` because no `searchVector` values exist. The API returns empty results.
- **Query too long for embedding** — Voyage AI accepts up to 8K tokens per input. A 2000-character query (~500 tokens) is well within limits. The Zod schema caps query at 2000 characters as a safety net.
- **Concurrent indexing** — If two indexing requests fire for the same document, the second will delete chunks created by the first (due to `deleteMany`). This is acceptable — the latest indexing wins. The transaction ensures no partial state.
- **Document ownership on search** — The SQL WHERE clause includes `d."userId" = $2` to ensure users only search their own documents. This is critical for multi-tenant security.
- **Form feed characters in non-PDF text** — `\f` is used to detect page boundaries in PDF-extracted text. Markdown and plain text won't have `\f`, so `pageNumber` will be null for their chunks. This is expected behavior.
- **searchVector not populated** — If `updateSearchVectors` fails, chunks exist but have null `searchVector`. Full-text search will return no results for those chunks, but semantic search still works. The hybrid search gracefully handles the case where one search method returns empty.
- **Prisma migration for searchVector** — Since Prisma doesn't manage `Unsupported` types in migrations well, the SQL migration must be run manually or via `prisma db execute`. Document this in the migration file.

---

### Required Tests

> **Note:** Vitest is not yet installed (deferred to issue 012). Code should be structured for testability — pure functions, separated concerns, mockable boundaries.

#### Unit Tests (High Priority)

- [ ] `src/lib/utils/tokens.test.ts` — `estimateTokenCount`: verifies counts for empty string (0), short text, long text. `splitIntoSentences`: verifies sentence splitting, handles abbreviations (Dr., Mr.), handles decimal numbers, handles multiple punctuation marks.
- [ ] `src/lib/rag/chunking.test.ts` — `chunkText`: empty input returns `[]`. Short text (<500 tokens) returns single chunk. Long text splits into multiple chunks. Token counts within 200-500 range. Overlap present between adjacent chunks (~10% content shared). Page numbers detected from `\f` characters. Section titles detected from `#` headings. Paragraph merging works for small paragraphs. Sentence splitting works for oversized paragraphs.
- [ ] `src/lib/rag/embeddings.test.ts` — `generateChunkEmbeddings`: empty array returns `[]`. Batches correctly at 128 boundary. Each EmbeddedChunk has 1024-dim embedding. Error handling on Voyage API failure. `storeChunksWithEmbeddings`: mock Prisma `$executeRaw`, verify chunks stored, verify `totalChunks` updated, verify old chunks deleted first.
- [ ] `src/lib/rag/retrieval.test.ts` — `hybridSearch`: mock both search functions, verify weighted combination (0.7/0.3). Deduplication works (same chunk from both searches). Score normalization works. Empty results from one search still returns other results. `semanticSearch` and `fullTextSearch`: mock `prisma.$queryRaw`, verify SQL structure.
- [ ] `src/lib/rag/reranking.test.ts` — `rerankChunks`: empty array returns `[]`. Reranked results sorted by rerankScore. Top-N truncation. Fallback on Voyage API error (returns original chunks).
- [ ] `src/lib/rag/pipeline.test.ts` — `retrieveContext`: full pipeline mock (embeddings → hybrid search → rerank). Empty query returns `[]`. Pipeline timing logged.
- [ ] `src/lib/validations/rag.test.ts` — `triggerEmbeddingsSchema`: valid documentId passes, empty string fails. `searchQuerySchema`: valid query passes, empty query fails, topK range validation, optional documentId.

#### Integration Tests (Medium Priority)

- [ ] `src/app/api/embeddings/route.test.ts` — POST: auth required (401), document not found (404), ownership check (403), document not ready (400), successful indexing (200 with totalChunks). Mock Prisma and Voyage.
- [ ] `src/app/api/search/route.test.ts` — POST: auth required (401), valid search returns chunks (200), empty results (200 with empty chunks), validation error (400). Mock pipeline.

#### Manual Tests

- [ ] Upload a PDF → document appears with totalChunks > 0
- [ ] Upload a Markdown file → chunks created with section titles preserved
- [ ] Upload a short text file → single chunk created
- [ ] Trigger `/api/embeddings` for an existing document → chunks re-indexed
- [ ] Search for a term present in an uploaded document → relevant chunks returned
- [ ] Search with `documentId` filter → only chunks from that document returned
- [ ] Search for a non-existent term → empty results, not an error
- [ ] `npm run build` passes with zero errors
- [ ] `npm run lint` passes with zero warnings

---

### Implementation Order

The Coder should implement sub-tasks in this exact order:

**Phase A — Types, Schemas & Utilities (Foundation)**

1. **T16** — Add/update RAG pipeline types in `src/types/rag.ts` (ChunkingOptions, SearchOptions, HybridSearchOptions)
2. **T1** — Create Zod validation schemas in `src/lib/validations/rag.ts`
3. **T2** — Implement token estimation and sentence splitting in `src/lib/utils/tokens.ts`

**Phase B — Chunking Engine (Issue 007 core)**

4. **T3** — Implement semantic chunking in `src/lib/rag/chunking.ts`

**Phase C — Embedding & Storage (Issue 007 core)**

5. **T7** — Add `searchVector` to Prisma schema + create SQL migration
6. **T4** — Implement batch embedding generation in `src/lib/rag/embeddings.ts`
7. **T5** — Implement pgvector chunk storage in `src/lib/rag/embeddings.ts`
8. **T6** — Implement full-text search vector setup in `src/lib/rag/embeddings.ts`

**Phase D — Indexing API (Issue 007 integration)**

9. **T8** — Implement POST `/api/embeddings` endpoint
10. **T9** — Integrate automatic indexing into document upload flow

**Phase E — Retrieval Engine (Issue 008 core)**

11. **T10** — Implement semantic search (pgvector cosine similarity)
12. **T11** — Implement full-text search (tsvector/tsquery)
13. **T12** — Implement hybrid search with score fusion

**Phase F — Reranking & Pipeline (Issue 008 orchestration)**

14. **T13** — Implement Voyage reranking wrapper
15. **T14** — Implement RAG pipeline orchestrator

**Phase G — Search API (Issue 008 integration)**

16. **T15** — Implement POST `/api/search` endpoint

---

### API Route Reference

#### POST /api/embeddings

```typescript
// Request: application/json
{
  "documentId": "cuid..."
}

// Response: 200
{
  "data": {
    "documentId": "cuid...",
    "totalChunks": 42,
    "status": "ready"
  }
}

// Error: 400 (document not ready or no extracted text)
{ "error": "Document has no extracted text to index" }

// Error: 401
{ "error": "Unauthorized" }

// Error: 403
{ "error": "Forbidden" }

// Error: 404
{ "error": "Document not found" }

// Error: 500 (indexing pipeline failure)
{ "error": "Failed to index document" }
```

#### POST /api/search

```typescript
// Request: application/json
{
  "query": "What are the key findings about climate change?",
  "documentId": "cuid...",   // optional — scope to single document
  "topK": 10                 // optional — default 10
}

// Response: 200
{
  "data": {
    "chunks": [
      {
        "id": "uuid...",
        "content": "The study found that global temperatures have risen by...",
        "score": 0.87,
        "rerankScore": 0.94,
        "documentId": "cuid...",
        "pageNumber": 12,
        "sectionTitle": "Key Findings"
      },
      {
        "id": "uuid...",
        "content": "According to the IPCC report, the primary drivers...",
        "score": 0.82,
        "rerankScore": 0.89,
        "documentId": "cuid...",
        "pageNumber": 3,
        "sectionTitle": "Introduction"
      }
    ],
    "query": "What are the key findings about climate change?",
    "totalResults": 2
  }
}

// Empty results: 200
{
  "data": {
    "chunks": [],
    "query": "something with no matches",
    "totalResults": 0
  }
}

// Error: 400
{ "error": "Validation failed", "details": { "query": ["Required"] } }

// Error: 401
{ "error": "Unauthorized" }
```

---

### Standards to Consult

- `docs/standards/CODE_STANDARDS.md` — Sections: No `any` Policy (use `unknown` + Zod at boundaries), Named Exports (no `export default`), Import Order, Error Handling (structured API errors, `console.error("[Module]")` pattern), Constants (SCREAMING_SNAKE_CASE for `VOYAGE_BATCH_SIZE`, etc.)
- `docs/standards/API_STANDARDS.md` — Sections: Route Structure, Response Envelope (`{ data }` / `{ error }`), Validation (Zod safeParse on every request), Authentication (Clerk `auth()` on every route, scope queries to user), Status Codes (200 for search, 201 for creates)
- `docs/standards/TESTING_STANDARDS.md` — Sections: Priority Tests (lib/rag/* is HIGH priority), Mocking Strategy (mock Voyage + Prisma at boundaries, never mock module under test), Arrange-Act-Assert pattern, Co-locate tests with source files

---

### Chunking Algorithm Detail

```
Input: extractedText (string, potentially 10K+ characters)

1. SPLIT by double newlines → paragraphs[]

2. DETECT metadata:
   - Page numbers: count \f (form feed) characters before each paragraph
   - Section titles: detect lines starting with # and track "current section"

3. For each paragraph:
   - estimateTokenCount(paragraph)
   - If < minTokens (200): mark for merging with next paragraph
   - If > maxTokens (500): split by sentences, group into sub-chunks within limit
   - If within range: use as-is

4. MERGE small paragraphs:
   - Accumulate paragraphs until combined tokens ≥ minTokens or next paragraph would exceed maxTokens
   - Emit merged chunk

5. APPLY overlap:
   - For each chunk after the first:
     - Take last ~10% tokens worth of text from previous chunk
     - Prepend to current chunk
   - Overlap is at paragraph/sentence boundaries (not mid-word)

6. ANNOTATE each chunk:
   - index: sequential (0, 1, 2, ...)
   - pageNumber: from \f tracking (null if no page breaks)
   - sectionTitle: from most recent # heading (null if none)
   - tokenCount: estimateTokenCount(chunk.content)

Output: TextChunk[]
```

### Raw SQL Reference

These are the key raw SQL queries the implementation uses, since Prisma doesn't support pgvector natively:

```sql
-- Insert chunk with vector embedding (T5)
INSERT INTO "Chunk" (id, "documentId", content, embedding, "chunkIndex", "pageNumber", "sectionTitle", "tokenCount", metadata)
VALUES ($1, $2, $3, $4::vector, $5, $6, $7, $8, $9::jsonb)

-- Update search vectors after chunk insertion (T6)
UPDATE "Chunk" SET "searchVector" = to_tsvector('english', content)
WHERE "documentId" = $1

-- Semantic search via cosine similarity (T10)
SELECT c.id, c.content, c."documentId", c."pageNumber", c."sectionTitle",
       1 - (c.embedding <=> $1::vector) AS score
FROM "Chunk" c
JOIN "Document" d ON c."documentId" = d.id
WHERE d."userId" = $2
  AND ($3::text IS NULL OR c."documentId" = $3)
ORDER BY c.embedding <=> $1::vector
LIMIT $4

-- Full-text search via tsvector (T11)
SELECT c.id, c.content, c."documentId", c."pageNumber", c."sectionTitle",
       ts_rank_cd(c."searchVector", to_tsquery('english', $1)) AS score
FROM "Chunk" c
JOIN "Document" d ON c."documentId" = d.id
WHERE d."userId" = $2
  AND ($3::text IS NULL OR c."documentId" = $3)
  AND c."searchVector" @@ to_tsquery('english', $1)
ORDER BY score DESC
LIMIT $4
```
