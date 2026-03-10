## Feature: Database Schema, Service Clients & App Shell

File: docs/plans/plan-003-004-database-shell.md
Issues: 003-database-schema-and-clients, 004-app-shell-and-navigation
Date: 2026-03-08
Phase: 0
Status: Planned

### Objective

Establish the data layer (Prisma schema with all 5 models, pgvector support, and service clients for Supabase/Voyage/Gemini) and the application shell (providers, sidebar, header, theme toggle, Zustand stores, and basic Motion animation primitives). After this, the app has a working database, all external service clients configured, a navigable layout with sidebar and dark mode toggle, and reusable animation wrappers.

---

### Sub-tasks

#### Issue 003 — Database Schema & Service Clients

- [ ] **T1: Install database and AI dependencies** — Criteria: `@prisma/client`, `prisma` (dev), `@supabase/supabase-js`, `voyageai`, `@ai-sdk/google` and `ai` added to package.json. Lockfile updated. `npx prisma generate` runs without errors.

- [ ] **T2: Define Prisma schema with all 5 models** — Criteria: `prisma/schema.prisma` contains User, Document, Chunk, Conversation, Message models with all fields matching `src/types/database.ts`. pgvector extension enabled via `previewFeatures = ["postgresqlExtensions"]` and `extensions = [pgvector]`. All relations defined with proper cascade deletes. Indexes on: `User.clerkId` (unique), `Document.userId`, `Chunk.documentId`, `Conversation.userId`, `Conversation.documentId`, `Message.conversationId`. The Chunk model uses `Unsupported("vector(1024)")` for the embedding column (Prisma doesn't natively support pgvector — raw SQL migration will add the column properly).

- [ ] **T3: Create initial Prisma migration** — Criteria: Run `npx prisma migrate dev --name init` to generate the initial migration in `prisma/migrations/`. Manually add raw SQL to the migration to: (1) `CREATE EXTENSION IF NOT EXISTS vector;` (2) create the proper `vector(1024)` column on Chunk, (3) create an IVFFlat or HNSW index on the embedding column. Verify `npx prisma generate` succeeds after migration.

- [ ] **T4: Implement Prisma client singleton** — Criteria: `src/lib/clients/prisma.ts` exports a named `prisma` constant. Uses globalThis caching pattern for dev hot-reload. Import `PrismaClient` from `@prisma/client`. No `export default`.

- [ ] **T5: Implement Supabase clients** — Criteria: `src/lib/clients/supabase.ts` exports two named functions: `createServerSupabaseClient()` (uses `SUPABASE_SERVICE_ROLE_KEY` for server-side operations) and `createBrowserSupabaseClient()` (uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client-side). Both read from environment variables. No `export default`.

- [ ] **T6: Implement Voyage AI client** — Criteria: `src/lib/clients/voyage.ts` exports named functions: `generateEmbeddings(texts: string[])` for batch embedding (calls Voyage API with model `voyage-3-lite`, returns `number[][]`), and `rerankDocuments(query: string, documents: string[])` for reranking (returns scored results). Uses `VOYAGE_API_KEY` from env. Includes proper error handling. No `export default`.

- [ ] **T7: Implement Gemini client** — Criteria: `src/lib/clients/gemini.ts` exports a named `geminiModel` configured via `@ai-sdk/google`'s `createGoogleGenerativeAI()` with `GOOGLE_GENERATIVE_AI_API_KEY`. Model ID: `gemini-2.5-flash`. No `export default`.

- [ ] **T8: Wire up Clerk webhook to persist users via Prisma** — Criteria: `src/app/api/webhooks/clerk/route.ts` imports `prisma` client. `user.created` → `prisma.user.create()` with clerkId, email, name (concatenate first_name + last_name). `user.updated` → `prisma.user.update()` matching by clerkId. `user.deleted` → `prisma.user.delete()` matching by clerkId. Remove `// TODO: issue 003` comments. Handle "user not found" on delete gracefully (log and return 200).

- [ ] **T9: Fix types/database.ts to use `type` instead of `interface`** — Criteria: All `interface` declarations in `src/types/database.ts` converted to `type` declarations per CODE_STANDARDS (prefer `type` over `interface`). No functional changes.

#### Issue 004 — App Shell & Navigation

- [ ] **T10: Install UI/state/animation dependencies** — Criteria: `@tanstack/react-query` (v5), `zustand`, `motion` (Framer Motion), `next-themes`, `lucide-react` (icons) added to package.json. Lockfile updated.

- [ ] **T11: Implement Zustand stores** — Criteria: `src/stores/ui-store.ts` exports `useUIStore` created with `zustand`'s `create()`. Implements all actions defined in existing interfaces (toggleSidebar, openModal, closeModal, setActiveDocumentId, setUploadProgress). Initial state: `sidebarOpen: true`, rest null/0. `src/stores/theme-store.ts` exports `useThemeStore` with `persist` middleware (localStorage key: `codex-theme`). Implements setTheme, toggleTheme. Initial theme: `"light"`. Both files: convert `interface` to `type`, named exports only, `"use client"` directive (Zustand stores are client-only).

- [ ] **T12: Implement ThemeProvider** — Criteria: `src/components/providers/theme-provider.tsx` wraps children with `next-themes`' `ThemeProvider` component. Props: `attribute="class"`, `defaultTheme="light"`, `enableSystem={false}`, `themes={["light", "dark"]}`. Named export `ThemeProvider`. `"use client"` directive.

- [ ] **T13: Implement QueryProvider** — Criteria: `src/components/providers/query-provider.tsx` creates a `QueryClient` instance (via `useState` to avoid SSR recreation) with `defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } }`. Wraps children with `QueryClientProvider`. Named export `QueryProvider`. `"use client"` directive.

- [ ] **T14: Compose providers in root layout** — Criteria: `src/app/layout.tsx` wraps children with `ThemeProvider` and `QueryProvider` (inside `ClerkProvider`). Order: `ClerkProvider` > `ThemeProvider` > `QueryProvider` > `{children}`. Import from `@/src/components/providers/`.

- [ ] **T15: Fix navigation config** — Criteria: `src/config/navigation.ts` — translate Spanish titles to English: "My Library" (href: `/library`, icon: `"library"`), "Ask the Librarian" (href: `/chat`, icon: `"message-square"`). Change `icon` type from `string` to actual Lucide icon component type. Use `type` instead of `interface` for `NavItem`.

- [ ] **T16: Implement Sidebar component** — Criteria: `src/components/layout/sidebar.tsx` — `"use client"` component. Reads `sidebarOpen` from `useUIStore`. Renders library-themed sidebar with: (1) app logo/title "The Codex" at top using Playfair Display, (2) navigation items from `navigationItems` config rendered as links with Lucide icons, (3) active link highlighting using `usePathname()`, (4) Clerk `<UserButton />` at bottom. Uses semantic color tokens (`bg-card`, `text-card-foreground`, `border-border`). Sidebar slides in/out using `SlideIn` motion primitive. Named export `Sidebar`. Width: 256px (desktop).

- [ ] **T17: Implement Header component** — Criteria: `src/components/layout/header.tsx` — `"use client"` component. Contains: (1) mobile menu button (hamburger icon, calls `toggleSidebar`), (2) page title area, (3) placeholder search input (non-functional, styled), (4) `ThemeToggle` component. Uses semantic color tokens. Named export `Header`.

- [ ] **T18: Implement ThemeToggle component** — Criteria: `src/components/layout/theme-toggle.tsx` — `"use client"` component. Uses `useTheme()` from `next-themes` to toggle between light/dark. Renders Sun/Moon icon from `lucide-react` based on current theme. Button styled with library tokens. Named export `ThemeToggle`.

- [ ] **T19: Implement MobileNav component** — Criteria: `src/components/layout/mobile-nav.tsx` — `"use client"` component. Overlay navigation for mobile screens. Reads `sidebarOpen` from `useUIStore`. Renders same nav items as Sidebar in a full-screen overlay. Close button. Backdrop click to close. Named export `MobileNav`. Only visible at `md` breakpoint and below.

- [ ] **T20: Implement dashboard layout** — Criteria: `src/app/(dashboard)/layout.tsx` — imports `Sidebar`, `Header`, `MobileNav`. Renders flex layout: sidebar on left (hidden on mobile), main content area on right with header at top. Uses `FadeIn` wrapper on main content. Named export `DashboardLayout`.

- [ ] **T21: Implement marketing layout** — Criteria: `src/app/(marketing)/layout.tsx` — minimal layout without sidebar. Simple centered container. Optional header with "Sign In" link. Named export `MarketingLayout`.

- [ ] **T22: Implement basic landing page** — Criteria: `src/app/(marketing)/page.tsx` — basic placeholder with: (1) hero section with "The Codex" title (Playfair Display), tagline, CTA button linking to `/sign-up`, (2) brief feature highlights (3 items). Uses library theme tokens. Named export `LandingPage`.

- [ ] **T23: Update root page** — Criteria: `src/app/page.tsx` — redirect to `(marketing)` landing page or serve as the marketing page itself (since `(marketing)/page.tsx` is the route group page, the root `page.tsx` should be removed or redirect). Resolve routing: if `(marketing)` group has a `page.tsx`, the root `page.tsx` conflicts — remove root `page.tsx` and let `(marketing)/page.tsx` serve `/`.

- [ ] **T24: Implement FadeIn motion primitive** — Criteria: `src/components/motion/fade-in.tsx` — `"use client"` component using `motion` (Framer Motion). Props: `children`, `delay?: number`, `duration?: number`, `className?: string`. Animates from `opacity: 0` to `opacity: 1`. Uses `--duration-normal` (300ms) as default. Named export `FadeIn`.

- [ ] **T25: Implement SlideIn motion primitive** — Criteria: `src/components/motion/slide-in.tsx` — `"use client"` component using `motion`. Props: `children`, `direction?: "left" | "right" | "up" | "down"`, `delay?: number`, `duration?: number`, `className?: string`. Animates from offset position to final position with fade. Default direction: `"left"`, default duration: 300ms. Named export `SlideIn`.

---

### Data Flow

#### Issue 003 — Database & Clients

```
Clerk Dashboard -> Webhook POST /api/webhooks/clerk -> Svix verify -> Zod parse -> Prisma -> Supabase PostgreSQL
                                                                                     ↑
                                                                        prisma.ts (singleton client)

Service clients (configured, not yet consumed by pipeline):
  supabase.ts -> Supabase (direct DB access for pgvector queries)
  voyage.ts   -> Voyage AI API (embeddings + reranking)
  gemini.ts   -> Google Gemini via Vercel AI SDK (generation)
```

#### Issue 004 — App Shell & Navigation

```
layout.tsx -> ClerkProvider -> ThemeProvider -> QueryProvider -> route group layout
                                                                   ↓
                                                    (dashboard)/layout.tsx
                                                    ├── Sidebar (useUIStore, usePathname, navigationItems)
                                                    ├── Header (ThemeToggle, useUIStore)
                                                    ├── MobileNav (useUIStore)
                                                    └── FadeIn -> {children}

Theme flow:
  ThemeToggle -> next-themes useTheme() -> toggles .dark class on <html> -> CSS variables switch
  useThemeStore (Zustand + persist) -> syncs with next-themes for persistence

UI state flow:
  Sidebar toggle -> useUIStore.toggleSidebar() -> Sidebar/MobileNav re-render
```

---

### Files to Create/Modify

#### Issue 003

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Add pgvector extension, all 5 models with relations and indexes |
| `prisma/migrations/[timestamp]_init/` | Create | Initial migration with raw SQL for pgvector |
| `src/lib/clients/prisma.ts` | Modify | Implement singleton PrismaClient with globalThis caching |
| `src/lib/clients/supabase.ts` | Modify | Implement server + browser Supabase clients |
| `src/lib/clients/voyage.ts` | Modify | Implement embeddings + reranking functions |
| `src/lib/clients/gemini.ts` | Modify | Configure Gemini model via @ai-sdk/google |
| `src/app/api/webhooks/clerk/route.ts` | Modify | Add Prisma calls for user create/update/delete |
| `src/types/database.ts` | Modify | Convert `interface` to `type` |
| `package.json` | Modify | Add @prisma/client, prisma, @supabase/supabase-js, voyageai, @ai-sdk/google, ai |

#### Issue 004

| File | Action | Description |
|------|--------|-------------|
| `src/stores/ui-store.ts` | Modify | Implement Zustand create() with all actions |
| `src/stores/theme-store.ts` | Modify | Implement Zustand create() + persist middleware |
| `src/components/providers/theme-provider.tsx` | Modify | Wrap with next-themes ThemeProvider |
| `src/components/providers/query-provider.tsx` | Modify | Implement TanStack Query QueryClientProvider |
| `src/app/layout.tsx` | Modify | Add ThemeProvider + QueryProvider wrappers |
| `src/config/navigation.ts` | Modify | Translate to English, use Lucide icon types |
| `src/components/layout/sidebar.tsx` | Modify | Full sidebar implementation |
| `src/components/layout/header.tsx` | Modify | Full header implementation |
| `src/components/layout/theme-toggle.tsx` | Modify | Theme toggle with Sun/Moon icons |
| `src/components/layout/mobile-nav.tsx` | Modify | Mobile overlay navigation |
| `src/app/(dashboard)/layout.tsx` | Modify | Integrate Sidebar + Header + MobileNav |
| `src/app/(marketing)/layout.tsx` | Modify | Clean marketing layout |
| `src/app/(marketing)/page.tsx` | Modify | Basic landing page with hero |
| `src/app/page.tsx` | Delete | Remove — `(marketing)/page.tsx` serves `/` |
| `src/components/motion/fade-in.tsx` | Modify | Implement with Framer Motion |
| `src/components/motion/slide-in.tsx` | Modify | Implement with Framer Motion |
| `package.json` | Modify | Add @tanstack/react-query, zustand, motion, next-themes, lucide-react |

---

### Standards to Consult

- `docs/standards/CODE_STANDARDS.md` — Sections: TypeScript Strict Rules (no `any`), Naming Conventions, Import Organization, Error Handling
- `docs/standards/UI_STANDARDS.md` — Sections: Design Tokens, Typography, Shadows, Borders, Spacing, Animation Durations, Responsive Breakpoints, Component Patterns (loading/empty/error states)
- `docs/standards/API_STANDARDS.md` — Sections: Webhooks, Authentication (for client setup patterns)
- `docs/standards/TESTING_STANDARDS.md` — Section: Test Requirements (defer actual tests to issue 012, but structure code for testability)

---

### Decisions

1. **Combined issues 003 + 004 on one branch** — Both are remaining Phase 0 foundations. 003 (data layer) has no dependency on 004 (UI layer), and 004 doesn't consume 003's clients yet. Single PR reduces overhead.

2. **Prisma + raw SQL for pgvector** — Prisma doesn't natively support `vector` types. Strategy: define the Chunk model with embedding as `Unsupported("vector(1024)")` in schema, then add raw SQL in the migration to create the actual column and vector index. This gives us Prisma for all CRUD operations while using Supabase client for raw vector queries in the RAG pipeline (issue 008).

3. **`next-themes` for dark mode instead of custom Zustand** — `next-themes` handles: SSR flash prevention (script injection), `<html>` class toggling, localStorage persistence, and system preference detection. The existing `theme-store.ts` Zustand store becomes unnecessary — `next-themes`' `useTheme()` hook replaces it entirely. However, keep `theme-store.ts` as a thin wrapper around `useTheme()` for consistency with other stores.

4. **Voyage AI client via `voyageai` npm package** — The official `voyageai` package provides typed SDK. If the package doesn't exist or is poorly maintained, fall back to raw `fetch` calls to `https://api.voyageai.com/v1/embeddings` and `https://api.voyageai.com/v1/rerank`.

5. **Gemini via `@ai-sdk/google` (Vercel AI SDK)** — Not `@google/generative-ai` directly. The Vercel AI SDK provides `streamText()`, `generateText()`, and streaming utilities used in issue 009. Configure the model now, consume it later.

6. **Root `page.tsx` removal** — Next.js route groups: `(marketing)/page.tsx` serves `/` because `(marketing)` is the layout group. The root `src/app/page.tsx` conflicts. Remove it.

7. **Sidebar width: 256px, collapsible** — Desktop sidebar is 256px fixed width. `sidebarOpen` state controls visibility. On mobile (<768px), sidebar becomes a full-screen overlay (`MobileNav`). No mini/icon-only mode for now (YAGNI).

8. **Lucide React for icons** — Lightweight, tree-shakeable icon library. Works well with shadcn/ui. Replaces string-based icon references in `navigation.ts` with actual component imports.

9. **QueryClient staleTime: 60s** — Prevents excessive refetching during navigation. Documents and conversations don't change rapidly, so 60s stale time is appropriate for the free-tier API budget.

---

### Edge Cases

- **Missing DATABASE_URL** — Prisma client should not crash the app at import time. The singleton pattern only creates the client when first accessed. If DATABASE_URL is missing, Prisma will throw at first query — which is acceptable (server-only).
- **Supabase keys missing** — Server client requires `SUPABASE_SERVICE_ROLE_KEY`. If missing, log an error and throw — this is a server-only client, not user-facing.
- **Voyage API key missing** — Functions should throw descriptive errors when `VOYAGE_API_KEY` is not set. These are only called during document processing (issue 007+).
- **Clerk webhook: user.deleted for non-existent user** — If the user was never synced (e.g., webhook missed), `prisma.user.delete()` will throw "Record not found". Catch and return 200 (idempotent).
- **Clerk webhook: user.updated before user.created** — Edge case where events arrive out of order. Use `prisma.user.upsert()` for `user.created` and `user.updated` to handle this gracefully.
- **Theme flash on initial load** — `next-themes` injects a `<script>` to set the class before React hydration, preventing the flash. Ensure `suppressHydrationWarning` is on `<html>` (already present in root layout).
- **Sidebar state on mobile vs desktop** — Default `sidebarOpen: true` on desktop, but sidebar should not render as overlay on desktop. Use CSS media queries + MobileNav component separation to handle this.
- **Route group conflict** — `src/app/page.tsx` and `src/app/(marketing)/page.tsx` both serve `/`. Must delete root `page.tsx`.
- **Zustand SSR hydration** — Zustand stores with `persist` middleware may cause hydration mismatches. Use `skipHydration` option or wrap store access in `useEffect` / `useSyncExternalStore` patterns.

---

### Required Tests

> **Note:** Vitest and Playwright are not yet installed (deferred to issue 012). Code should be structured for testability. Write test files only if the test runner is available.

- [ ] Unit: `src/lib/clients/prisma.test.ts` — Verifies singleton pattern returns same instance
- [ ] Unit: `src/lib/clients/voyage.test.ts` — Verifies embedding function calls API correctly (mock fetch)
- [ ] Unit: `src/stores/ui-store.test.ts` — Verifies toggleSidebar, openModal/closeModal state transitions
- [ ] Unit: `src/stores/theme-store.test.ts` — Verifies setTheme, toggleTheme behavior
- [ ] Manual: Prisma migration runs successfully against Supabase
- [ ] Manual: Clerk webhook creates/updates/deletes users in database
- [ ] Manual: Sidebar navigates between Library and Chat pages
- [ ] Manual: Theme toggle switches between light and dark mode without flash
- [ ] Manual: Mobile navigation overlay opens/closes correctly
- [ ] Manual: `npm run build` passes with zero errors
- [ ] Manual: `npm run lint` passes with zero warnings

---

### Implementation Order

The Coder should implement sub-tasks in this exact order:

**Phase A — Database Layer (Issue 003)**

1. **T1** — Install database/AI dependencies
2. **T9** — Fix types/database.ts (interface → type)
3. **T2** — Define Prisma schema with all 5 models
4. **T3** — Create initial migration (with pgvector raw SQL)
5. **T4** — Implement Prisma client singleton
6. **T5** — Implement Supabase clients
7. **T6** — Implement Voyage AI client
8. **T7** — Implement Gemini client
9. **T8** — Wire up Clerk webhook to Prisma

**Phase B — App Shell (Issue 004)**

10. **T10** — Install UI/state/animation dependencies
11. **T11** — Implement Zustand stores (ui-store, theme-store)
12. **T12** — Implement ThemeProvider (next-themes)
13. **T13** — Implement QueryProvider (TanStack Query)
14. **T14** — Compose providers in root layout
15. **T15** — Fix navigation config (English, Lucide icons)
16. **T24** — Implement FadeIn motion primitive
17. **T25** — Implement SlideIn motion primitive
18. **T18** — Implement ThemeToggle
19. **T16** — Implement Sidebar
20. **T17** — Implement Header
21. **T19** — Implement MobileNav
22. **T20** — Implement dashboard layout
23. **T21** — Implement marketing layout
24. **T22** — Implement landing page
25. **T23** — Remove root page.tsx (resolve route conflict)

---

### Prisma Schema Reference

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector")]
}

model User {
  id            String         @id @default(cuid())
  clerkId       String         @unique
  email         String
  name          String
  plan          String         @default("free")   // "free" | "premium"
  createdAt     DateTime       @default(now())
  documents     Document[]
  conversations Conversation[]
}

model Document {
  id            String         @id @default(cuid())
  userId        String
  title         String
  originalName  String
  fileUrl       String
  fileType      String         // "pdf" | "md" | "txt" | "url"
  summary       String?
  totalChunks   Int            @default(0)
  status        String         @default("processing") // "processing" | "ready" | "error"
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  chunks        Chunk[]
  conversations Conversation[]

  @@index([userId])
}

model Chunk {
  id           String   @id @default(cuid())
  documentId   String
  content      String
  embedding    Unsupported("vector(1024)")?
  chunkIndex   Int
  pageNumber   Int?
  sectionTitle String?
  tokenCount   Int
  metadata     Json     @default("{}")
  document     Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([documentId])
}

model Conversation {
  id         String    @id @default(cuid())
  userId     String
  documentId String?
  title      String
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  document   Document? @relation(fields: [documentId], references: [id], onDelete: SetNull)
  messages   Message[]

  @@index([userId])
  @@index([documentId])
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  role           String       // "user" | "assistant"
  content        String
  citations      Json         @default("[]")
  createdAt      DateTime     @default(now())
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
}
```

**Migration raw SQL to add after Prisma generates:**

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector index for similarity search (HNSW is faster for queries)
CREATE INDEX IF NOT EXISTS "Chunk_embedding_idx" ON "Chunk"
USING hnsw ("embedding" vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

---

### Component Architecture Reference

#### Sidebar (T16)

```
Sidebar
├── Logo/Title: "The Codex" (Playfair Display)
├── Navigation
│   ├── NavItem: "My Library" (Library icon) → /library
│   └── NavItem: "Ask the Librarian" (MessageSquare icon) → /chat
└── Footer
    └── Clerk UserButton
```

#### Header (T17)

```
Header
├── MobileMenuButton (hamburger, md:hidden)
├── PageTitle area (flexible)
├── SearchInput (placeholder, non-functional)
└── ThemeToggle
```

#### Dashboard Layout (T20)

```
DashboardLayout
├── Sidebar (hidden on mobile, w-64 on desktop)
├── MobileNav (visible on mobile only)
└── Main content area
    ├── Header
    └── FadeIn > {children}
```
