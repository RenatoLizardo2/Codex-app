# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**The Codex** — an AI-powered personal knowledge base ("Second Brain"). Users upload documents (PDFs, Markdown, text, URLs) and ask natural language questions. The app uses RAG (Retrieval-Augmented Generation) to answer with verified citations from original documents.

Visual theme: **classical library** — wood shelves, warm parchment/gold tones, serif typography, book metaphors throughout the UI. Each uploaded document is a "tome" in the user's personal library.

**Status:** Early stage — project structure and documentation created, implementation pending.

## Language Policy

All documentation (`docs/`), code comments, commit messages, UI copy, and component text **must be in English**. No Spanish in any project files.

## Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint (must pass with zero warnings/errors)
npm run start        # Start production server
```

Future commands (not yet configured):
```bash
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push schema to database
npx prisma studio    # Visual database browser
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), TypeScript (strict) |
| Styling | Tailwind CSS v4, shadcn/ui |
| Auth | Clerk |
| Database | Supabase (PostgreSQL + pgvector) |
| ORM | Prisma |
| AI/LLM | Google Gemini 2.5 Flash (via Vercel AI SDK) |
| Embeddings | Voyage AI (voyage-3-lite, 1024 dims) |
| Client State | Zustand |
| Server State | TanStack Query v5 |
| Animations | Motion (Framer Motion) |
| File Storage | Vercel Blob |
| Testing | Vitest (unit) + Playwright (E2E) |
| Deploy | Vercel |

All services run on **free tiers** ($0/month).

## Architecture

### Directory Structure

```
src/
  app/                    # Next.js App Router
    (marketing)/          # Public pages (landing, no sidebar)
    (auth)/               # Clerk auth pages
    (dashboard)/          # Protected routes with sidebar
      library/            # "My Library" — document grid
      document/[id]/      # Individual document view
      chat/               # Global chat & conversations
    api/                  # API routes
      documents/          # CRUD + file upload
      chat/               # Streaming chat endpoint
      search/             # Hybrid search
      embeddings/         # Trigger document indexing
      webhooks/clerk/     # Clerk user sync
  components/
    ui/                   # shadcn/ui primitives
    library/              # Library domain components
    chat/                 # Chat interface components
    motion/               # Reusable animation primitives
    layout/               # Sidebar, header, navigation
    providers/            # React context providers
  stores/                 # Zustand stores (ui, chat, theme)
  hooks/
    queries/              # TanStack Query hooks
  lib/
    clients/              # External service clients
    rag/                  # RAG pipeline (chunking, embeddings, retrieval, reranking, generation)
    parsers/              # Text extraction (PDF, MD, TXT, URL)
    utils/                # Helpers, constants
    validations/          # Zod schemas
  types/                  # TypeScript type definitions
  config/                 # App configuration
prisma/                   # Schema & migrations
docs/                     # Project documentation & standards
```

### RAG Pipeline

```
Upload → Text Extraction → Semantic Chunking → Voyage Embeddings → pgvector Storage
                                                                         ↓
Response (streaming + citations) ← Gemini Flash ← Voyage Reranking ← Hybrid Search
```

- **Chunking:** Split by natural paragraphs/sections, 200-500 tokens, 10-15% overlap
- **Search:** Hybrid — cosine similarity (pgvector) + full-text (PostgreSQL), weighted 0.7/0.3
- **Reranking:** Voyage Rerank on retrieved chunks before generation

### State Architecture

- **Zustand** → client-only state: sidebar, theme, modals, active views
- **TanStack Query** → server state: documents, conversations, messages (with caching, background refetch)

## Conventions

### TypeScript
- `any` is prohibited — use `unknown` + Zod validation at boundaries
- Prefer `type` over `interface`
- Zod schemas as source of truth: `z.object({...})` → `z.infer<typeof Schema>`
- Path alias: `@/*` maps to project root

### Naming
- **Routes:** kebab-case (`/dashboard/video-calls`)
- **React components:** PascalCase files (`BookCard.tsx`)
- **Non-component modules:** kebab-case (`api-client.ts`)
- **Functions/vars:** camelCase
- **Constants:** SCREAMING_SNAKE_CASE

### React / Next.js
- Default to Server Components; `"use client"` only when needed
- Keep UI components presentational; logic in hooks and lib modules
- Every page/panel must handle: loading state, empty state, error state

### Git
- Conventional Commits: `<type>(<scope>): <description>`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Scopes: `auth`, `library`, `chat`, `rag`, `upload`, `ui`, `db`, `api`, `config`, `docs`
- Branches: `main`, `feat/*`, `fix/*`, `chore/*`

## Design System

### Colors — Light Mode ("The Library")
- Wood dark `#3E2723` — headers, sidebar
- Parchment `#FFF8E1` — main background
- Gold `#C6893F` — CTAs, active elements
- Cream `#FFFDE7` — cards, chat bubbles
- Leather `#8D6E63` — borders, secondary text

### Colors — Dark Mode ("Library at Night")
- Night bg `#1A1A2E` — main background
- Night surface `#16213E` — cards, sidebar
- Night gold `#E2B049` — accents, CTAs
- Night text `#F5E6CC` — primary text

### Typography
- **Headings:** Playfair Display (serif display)
- **Body:** Lora (serif, warm)
- **UI/Labels:** Inter (sans-serif)
- **Code:** JetBrains Mono

### Animations
- Use Motion (Framer Motion) for all animations
- Book tilt on hover, stagger effects for lists, page transitions
- Streaming text animation for chat responses

## Database Models (Prisma — to be implemented)

- **User** — synced from Clerk (clerkId, email, name, plan)
- **Document** — uploaded files (title, fileUrl, fileType, status: processing|ready|error)
- **Chunk** — semantic text chunks (content, embedding vector, pageNumber, metadata)
- **Conversation** — chat sessions (userId, optional documentId for scoped chats)
- **Message** — chat messages (role: user|assistant, content, citations)

## Environment Variables

See `.env.example` for required keys:
- `CLERK_*` — authentication
- `SUPABASE_*` / `DATABASE_URL` — database
- `GOOGLE_GENERATIVE_AI_API_KEY` — Gemini LLM
- `VOYAGE_API_KEY` — embeddings & reranking
- `BLOB_READ_WRITE_TOKEN` — file storage

Never commit `.env` files or secrets.

## Agent Workflow

Three agents work on each issue in sequence:
1. **Planner** (`.claude/agents/planner.md`) — Creates `docs/plans/plan-[name].md` BEFORE any coding
2. **Coder** (`.claude/agents/coder.md`) — Implements the plan, writes tests alongside code
3. **Reviewer** (`.claude/agents/reviewer.md`) — Reviews against standards, creates `docs/reviews/review-[name].md`

**Rule**: No agent advances without documentation. Max 3 coder/reviewer cycles before human escalation.

## Key Documentation

- [THE_CODEX_SPEC.md](THE_CODEX_SPEC.md) — complete project specification
- [docs/PROJECT_SPEC.md](docs/PROJECT_SPEC.md) — structured spec with phases
- [docs/roadmap/ROADMAP.md](docs/roadmap/ROADMAP.md) — 5-phase implementation roadmap (13 issues)
- [docs/standards/](docs/standards/) — code, UI, API, testing, git standards
- [.claude/agents/](.claude/agents/) — planner, coder, reviewer agent definitions
