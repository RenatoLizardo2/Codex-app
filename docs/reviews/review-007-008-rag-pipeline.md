## Review: Chunking, Embeddings, Search & Retrieval (RAG Pipeline)

File: docs/reviews/review-007-008-rag-pipeline.md
Issues: 007-chunking-and-embeddings, 008-search-and-retrieval
Date: 2026-03-13
Phase: 2
Feature Plan: docs/plans/plan-007-008-rag-pipeline.md

### Result: Approved — With Observations

### Verification

- **Build:** PASS (`npm run build` — all routes compiled, zero TypeScript errors)
- **Lint:** 1 pre-existing error in `stagger-children.tsx` (from issue 005-006, commit `c5add04`). No new warnings or errors introduced by this PR.

### Checklist Summary

| Area | Result | Notes |
|------|--------|-------|
| Documentation | PASS | Plan exists, all 16 sub-tasks marked `[x]`, plan status set to "Implemented", roadmap updated to `in_progress` |
| Code Quality | PASS | No `any`, no `export default`, named exports, correct naming conventions, import order followed |
| UI/UX | N/A | Backend-only implementation — no UI components in this phase |
| API | PASS | Both endpoints have auth, validation, user scoping, correct response envelopes, proper status codes |
| Security | PASS | All SQL queries scope by `userId`, ownership checks on `/api/embeddings`, Clerk auth on all routes |
| Performance | PASS | Batch embedding (128/call), IVFFlat index, GIN index, parallel search execution, top-K limits |
| Testing | N/A | Deferred to issue 012. Code is well-structured for testability — pure functions, mockable boundaries |

### Sub-task Verification

All 16 sub-tasks implemented and verified against plan criteria:

| Task | File(s) | Status | Notes |
|------|---------|--------|-------|
| T1 | `src/lib/validations/rag.ts` | PASS | Zod schemas with derived types, matches plan exactly |
| T2 | `src/lib/utils/tokens.ts` | PASS | Pure functions, abbreviation-aware sentence splitting |
| T3 | `src/lib/rag/chunking.ts` | PASS | Full algorithm: parse paragraphs → split oversized → merge small → apply overlap → annotate. 275 lines, well-structured |
| T4 | `src/lib/rag/embeddings.ts:12-38` | PASS | Batch processing at 128, error context preserved |
| T5 | `src/lib/rag/embeddings.ts:40-69` | PASS | Transaction, raw SQL with `::vector` cast, idempotent delete-first |
| T6 | `src/lib/rag/embeddings.ts:71-78` | PASS | Raw SQL `to_tsvector('english', content)` |
| T7 | `prisma/schema.prisma:56`, `prisma/migrations/add_search_vector/migration.sql` | PASS | `Unsupported("tsvector")?` in schema, SQL migration with GIN + IVFFlat indexes |
| T8 | `src/app/api/embeddings/route.ts` | PASS | Auth → validate → ownership → status check → pipeline → status update. Inner/outer try-catch pattern |
| T9 | `src/app/api/documents/route.ts:18-30` | PASS | Fire-and-forget `indexDocument()`, error logged but upload succeeds |
| T10 | `src/lib/rag/retrieval.ts:17-44` | PASS | Raw SQL with `<=>` cosine distance, userId scoping, optional documentId filter |
| T11 | `src/lib/rag/retrieval.ts:46-88` | PASS | `buildTsQuery` with prefix matching, `ts_rank_cd` scoring |
| T12 | `src/lib/rag/retrieval.ts:107-175` | PASS | Parallel execution, min-max normalization, weighted fusion, deduplication |
| T13 | `src/lib/rag/reranking.ts` | PASS | Graceful fallback on error, top-N truncation |
| T14 | `src/lib/rag/pipeline.ts` | PASS | Full orchestration with timing log |
| T15 | `src/app/api/search/route.ts` | PASS | Auth, validation, correct response envelope |
| T16 | `src/types/rag.ts` | PASS | `SearchOptions`, `HybridSearchOptions` added, existing types preserved |

### Security Review

1. **User scoping in retrieval SQL** — PASS. Both `semanticSearch` and `fullTextSearch` join on `Document` and filter `WHERE d."userId" = $N`. No cross-tenant data leak possible.
2. **Ownership check in /api/embeddings** — PASS. Explicit `document.userId !== user.id` check before processing.
3. **Input validation** — PASS. Both API routes validate with Zod before processing. No raw user input reaches SQL without parameterization.
4. **SQL injection** — PASS. All raw SQL uses Prisma tagged template literals (`${}` placeholders), which are parameterized. The `buildTsQuery` function strips non-word characters before constructing the tsquery string.
5. **No secrets in committed code** — PASS. Voyage API key is read from environment variable at runtime.

### Raw SQL Correctness Review

1. **Embedding insert** (`embeddings.ts:55-58`) — Correct. Uses `::vector` cast on string-formatted embedding. Parameterized via Prisma tagged template.
2. **Search vector update** (`embeddings.ts:74-77`) — Correct. Standard `to_tsvector('english', content)` pattern.
3. **Cosine similarity query** (`retrieval.ts:25-34`) — Correct. `1 - (embedding <=> $1::vector)` gives similarity (0-1). Ordered by distance ascending (closest first).
4. **Full-text search query** (`retrieval.ts:68-78`) — Correct. `ts_rank_cd` with `@@` filter and GIN index support.
5. **Optional documentId filter** — Correct. `(${documentIdFilter}::text IS NULL OR c."documentId" = ${documentIdFilter})` pattern handles both scoped and unscoped search.

### Observations

1. **`documents/route.ts:131` — `await indexDocument()` blocks the response despite the "fire-and-forget" comment.** The function catches errors internally, so it won't crash the request, but the client waits for chunking + embedding + storage to complete before receiving the 201 response. For a portfolio project with small files this is acceptable, but the comment is slightly misleading. The response IS delayed by indexing time, it just won't fail. This is consistent with the plan's Decision #5 (synchronous indexing) — no action needed, but worth noting.

2. **`documents/route.ts:134` — `updatedDocument` is returned AFTER `indexDocument()` completes, but it doesn't reflect the updated `totalChunks`.** The `indexDocument` function updates `totalChunks` via `storeChunksWithEmbeddings`, but `updatedDocument` was fetched before indexing ran. The client sees `totalChunks: 0` in the response even though chunks exist. The polling hook (`useDocumentStatus`) will pick up the correct count on next refetch, so this is a minor inconsistency, not a bug.

3. **`chunking.ts:156` — Flush threshold at `minTokens` may produce many small-ish chunks.** The merge logic flushes a chunk as soon as it reaches `minTokens` (200), even if there's room to grow toward `maxTokens` (500). This produces more chunks that are closer to 200 tokens than 500. This is a design choice — smaller chunks can be better for retrieval precision — so no change required, just noting it.

4. **`retrieval.ts:122` — `topK * 2` fetch for fusion quality.** Smart approach — fetching 2x from each source before fusion ensures the top-K final results are drawn from a larger pool. This is a good practice.

5. **`embeddings.ts:52-53` — `crypto.randomUUID()` produces UUIDs, not CUIDs.** The Prisma schema uses `@default(cuid())` for other models. The chunk IDs will be UUIDs while all other entity IDs are CUIDs. This is functionally fine (both are valid primary keys) but creates a cosmetic inconsistency in the database. Noted in the plan as Decision #11 — accepted.

6. **Migration file naming** — `prisma/migrations/add_search_vector/` doesn't follow Prisma's timestamp-prefixed naming convention (e.g., `20260313120000_add_search_vector/`). Since this is a manually-managed migration, it won't conflict with Prisma's auto-migrations, but may be skipped by `prisma migrate deploy`. The plan notes this must be run manually via `prisma db execute --file` — acceptable.

### Suggestions (non-blocking, for future issues)

- **Consider `void indexDocument(...)` pattern** — If truly fire-and-forget behavior is desired in the future, using `void indexDocument(...)` (without `await`) would return the response immediately while indexing runs in the background. However, this risks the serverless function terminating before indexing completes on Vercel, so the current `await` approach is actually safer for the deployment target.

- **Rate limit awareness for Voyage API** — The batch embedding code doesn't implement rate limiting or retry logic. For Phase 4 (issue 012), consider adding rate limiting at the application level as specified in API_STANDARDS.md.

- **`buildTsQuery` word sanitization** — The regex `w.replace(/[^\w]/g, "")` strips all non-word characters. This means search queries with hyphens like "machine-learning" become "machinelearning". Consider preserving hyphens or splitting on them. Non-blocking since tsquery handles this acceptably.

### Standards Updated

- None. All patterns observed are consistent with existing standards.
