# Roadmap

The Codex — AI-powered personal knowledge base with RAG and classical library theme

## Deployment assumptions

- Branch: `main`
- All services on free tiers ($0/month)
- Solo developer — issues organized by Backend / Frontend sections within each phase
- Agent-driven workflow: Planner → Coder → Reviewer (see [Agent Workflow](#agent-workflow))

## Agent Workflow

Three agents handle each issue in sequence:

1. **Planner** (`.claude/agents/planner.md`) — Reads the issue, researches the codebase, creates `docs/plans/plan-[name].md` with a detailed implementation plan
2. **Coder** (`.claude/agents/coder.md`) — Implements the plan exactly, writes tests alongside code, commits granularly per sub-task
3. **Reviewer** (`.claude/agents/reviewer.md`) — Reviews against standards and plan, creates `docs/reviews/review-[name].md`, approves or sends back for fixes

**Rule**: No agent advances without documentation. Max 3 coder/reviewer cycles before human escalation.

**Issue flow**: Pick issue from roadmap → pass to Planner → Planner creates plan → pass plan to Coder → Coder implements → pass to Reviewer → Reviewer approves or requests fixes → mark issue as completed.

## Issue naming convention

`NNN-descriptive-kebab-case-name` — e.g., `001-design-system-and-theming`

Each issue maps to a feature branch: `feat/NNN-descriptive-name`

## Status legend

- `pending` — Not started
- `claimed` — Planner is creating the plan
- `in_progress` — Coder is implementing
- `in_review` — Reviewer is reviewing
- `completed` — Merged to main

---

# Phase 0 — Foundations

**Goal:** Establish project infrastructure — config, design system (light + dark), auth, database, and app shell. After this phase, the app boots with auth, has the full library theme applied with dark mode working, and the core layout is navigable.

## Backend

- [x] `002-auth-and-user-sync` — **Status:** `completed`
  Clerk integration: middleware for protected routes, sign-in/sign-up pages under `(auth)/` route group, Clerk webhook (`/api/webhooks/clerk`) to sync users to database. Zod validation on webhook payload.

- [x] `003-database-schema-and-clients` — **Status:** `completed`
  Prisma schema with all 5 models (User, Document, Chunk, Conversation, Message). Supabase project setup with pgvector extension enabled. Service clients: `prisma.ts` (singleton), `supabase.ts` (server + browser), `voyage.ts`, `gemini.ts`. Environment variables in `.env.example`.

## Frontend

- [x] `001-design-system-and-theming` — **Status:** `completed`
  Tailwind CSS v4 configuration with custom design tokens (all color variables for light + dark mode). Font loading via `next/font/google` (Playfair Display, Lora, Inter, JetBrains Mono). Custom shadows, borders, and spacing tokens in `globals.css`. shadcn/ui initialization with library theme mapped to semantic variables. Dark mode CSS variables (Library at Night palette). Utility `cn()` helper.

- [x] `004-app-shell-and-navigation` — **Status:** `completed`
  Root layout with all providers (QueryProvider, ThemeProvider). Route group layouts: `(marketing)` without sidebar, `(dashboard)` with sidebar. Sidebar component with navigation items and basic slide-in animation. Header with placeholder search. Theme toggle (light/dark) with working dark mode switch. Zustand stores (`ui-store`, `theme-store`). Basic landing page placeholder. Basic Motion primitives: FadeIn, SlideIn (used by sidebar and page content).

**Shared contracts:**

- [x] Zod validation schemas: `src/lib/validations/document.ts`, `chat.ts`, `upload.ts`
- [ ] TypeScript types: `src/types/database.ts`, `api.ts`, `chat.ts`, `rag.ts`
- [ ] Site config: `src/config/site.ts`, `navigation.ts`, `rag.ts`

---

# Phase 1 — Document Management

**Goal:** Users can upload documents (PDF, MD, TXT, URL), files are stored in Vercel Blob, text is extracted, and documents are displayed in the library with the full book/tome visual treatment. Basic hover and entrance animations included.

## Backend

- [ ] `005-document-upload-and-storage` — **Status:** `in_progress`
  Document CRUD API routes (`/api/documents` — GET list, POST create; `/api/documents/[id]` — GET, PATCH, DELETE). Vercel Blob integration for file storage. Upload validation (file size, type). Text extraction pipeline: parsers for PDF (`pdf-parse`), Markdown, plain text, and URL (fetch + extract). Document status management (processing → ready → error).

## Frontend

- [ ] `006-library-ui-and-document-view` — **Status:** `in_progress`
  Library page (`/library`): BookShelf grid with responsive columns (1→2→3→4) and stagger entrance animation. BookCard component with tome styling (spine color, serif title, page count badge) and hover effect (subtle scale + shadow lift). UploadZone with drag-and-drop. EmptyLibrary state. Document viewer page (`/document/[id]`): document content display, summary section placeholder, metadata. TanStack Query hooks: `useDocuments`, `useDocumentStatus` (polling). Upload hook with progress tracking. Loading skeletons (parchment shimmer) and error states for all views.

---

# Phase 2 — RAG Pipeline

**Goal:** Uploaded documents are automatically chunked, embedded, and indexed. Users can search across their documents with hybrid search. The full retrieval pipeline is operational.

## Backend

- [ ] `007-chunking-and-embeddings` — **Status:** `pending`
  Semantic chunking engine (`lib/rag/chunking.ts`): split by paragraphs/sections, 200-500 token target, 10-15% overlap, preserve metadata (page number, section title, heading). Voyage AI embeddings integration (`lib/rag/embeddings.ts`): batch embedding generation (max 128 per call), 1024-dimension vectors. pgvector storage: insert chunks with embeddings. Embeddings API route (`/api/embeddings`) to trigger indexing for a document. Background processing: update document status as chunks are indexed.

- [ ] `008-search-and-retrieval` — **Status:** `pending`
  Hybrid search (`lib/rag/retrieval.ts`): cosine similarity via pgvector + PostgreSQL full-text search (tsvector/tsquery), weighted combination (0.7 semantic + 0.3 keyword). Voyage reranking (`lib/rag/reranking.ts`): reorder retrieved chunks by relevance. RAG pipeline orchestrator (`lib/rag/pipeline.ts`): query → embed → retrieve → rerank → return top-K chunks. Search API route (`/api/search`).

---

# Phase 3 — Chat & AI Generation

**Goal:** Users can ask questions about their documents and receive streaming AI responses with inline citations. Conversations are persisted and accessible from the sidebar. Auto-summary is generated on upload. This phase delivers the complete functional application.

## Backend

- [ ] `009-chat-api-and-generation` — **Status:** `pending`
  Gemini Flash integration via Vercel AI SDK (`lib/clients/gemini.ts`). Prompt construction (`lib/rag/generation.ts`): system prompt with librarian persona, context injection from retrieved chunks, citation formatting instructions. Streaming chat endpoint (`/api/chat`): authenticate → validate → retrieve relevant chunks via RAG pipeline → stream response with `streamText()`. Citation extraction: parse model output for chunk references, store in message as JSONB. Conversation and message persistence: create/update conversations, store messages with role and citations. Auto-summary generation: after document indexing completes, send representative chunks to Gemini to generate a document summary, store in document record.

## Frontend

- [ ] `010-chat-ui-and-conversations` — **Status:** `pending`
  Chat interface (`/chat` and `/chat/[conversationId]`): full chat layout with message list and input. MessageBubble component (user/assistant variants) with slide-up entrance animation. StreamingText component with typewriter animation. CitationCard component linking to source document/page. ChatInput with submit handling. Conversation sidebar: list of past conversations, create new conversation. Document-scoped chat (from document view page). Document status polling UI: real-time status indicators (processing spinner, ready badge, error state). Summary display on document page. TanStack Query hooks: `useConversations`, `useMessages`. Zustand `chat-store` for draft input and active document selection. Loading, empty, and error states for all chat views.

---

# Phase 4 — Advanced Polish & Production

**Goal:** Elevate the visual experience with advanced animations. Ensure production quality with comprehensive tests, rate limiting, responsive design, and documentation. After this phase the app is portfolio-ready.

## Frontend

- [ ] `011-advanced-animations` — **Status:** `pending`
  Advanced Motion animation primitives (`components/motion/`): BookTilt (rotateY 3D tilt + gold glow on hover), StaggerChildren (configurable delay), PageTransition (AnimatePresence route transitions). Sidebar expand/collapse with layout animation. Modal open/close animations (book opening effect). Desk lamp radial gradient effect in dark mode chat area. Parallax on library header. Grid layout animation when filtering/searching. Respect `prefers-reduced-motion` — disable all non-essential animations.

## Full-Stack

- [ ] `012-testing-and-quality` — **Status:** `pending`
  Vitest unit tests: RAG pipeline (chunking, embeddings, retrieval, reranking), Zod schemas, parsers, utility functions, Zustand stores. Target 80% coverage on `lib/`. Playwright E2E: auth flow, upload flow, chat flow, library navigation. Rate limiting: per-user request tracking for Gemini/Voyage API calls, 429 responses with user-friendly messages.

- [ ] `013-production-readiness` — **Status:** `pending`
  Responsive mobile: sidebar as drawer, touch-friendly targets (44x44px), single-column layouts on mobile, chat full-screen on mobile. Accessibility audit: contrast ratios, keyboard navigation, screen reader labels. README: project description, architecture diagram, screenshots/GIFs, setup instructions, tech decisions, RAGAS evaluation metrics. `.env.example` fully documented. OG image for social sharing. Final performance review.

---

# Requirements traceability checklist

- [x] User authentication with Clerk (Phase 0: `002`)
- [x] User data sync via webhook (Phase 0: `002`)
- [x] Database schema with pgvector (Phase 0: `003`)
- [x] Design system with library theme (Phase 0: `001`)
- [x] Dark mode support (Phase 0: `001`)
- [x] App shell with sidebar navigation (Phase 0: `004`)
- [x] Basic Motion primitives — FadeIn, SlideIn (Phase 0: `004`)
- [ ] Document upload to Vercel Blob (Phase 1: `005`)
- [ ] Text extraction from PDF, MD, TXT, URL (Phase 1: `005`)
- [ ] Library UI with book/tome metaphor (Phase 1: `006`)
- [ ] Book card hover effects and stagger entrance (Phase 1: `006`)
- [ ] Loading skeletons with parchment shimmer (Phase 1: `006`)
- [ ] Semantic chunking with overlap (Phase 2: `007`)
- [ ] Voyage AI embeddings (Phase 2: `007`)
- [ ] pgvector indexing (Phase 2: `007`)
- [ ] Hybrid search: semantic + full-text (Phase 2: `008`)
- [ ] Voyage reranking (Phase 2: `008`)
- [ ] RAG pipeline orchestration (Phase 2: `008`)
- [ ] Gemini Flash streaming via Vercel AI SDK (Phase 3: `009`)
- [ ] Chat with inline citations (Phase 3: `009`, `010`)
- [ ] Conversation history and persistence (Phase 3: `009`, `010`)
- [ ] Auto document summary (Phase 3: `009`)
- [ ] Document status polling UI (Phase 3: `010`)
- [ ] Chat message animations (Phase 3: `010`)
- [ ] Advanced animations — BookTilt, PageTransition, layout (Phase 4: `011`)
- [ ] Unit tests with Vitest (Phase 4: `012`)
- [ ] E2E tests with Playwright (Phase 4: `012`)
- [ ] Rate limiting (Phase 4: `012`)
- [ ] Responsive mobile (Phase 4: `013`)
- [ ] Accessibility audit (Phase 4: `013`)
- [ ] README with architecture + screenshots (Phase 4: `013`)
