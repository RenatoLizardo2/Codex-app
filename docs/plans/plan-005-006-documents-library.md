## Feature: Document Upload, Storage & Library UI

File: docs/plans/plan-005-006-documents-library.md
Issues: 005-document-upload-and-storage, 006-library-ui-and-document-view
Date: 2026-03-10
Phase: 1
Status: Planned

### Objective

Implement the full document management pipeline: CRUD API routes for documents, file storage via Vercel Blob, text extraction from PDF/MD/TXT/URL, and document status management. Then build the library UI with BookShelf grid, BookCard with tome styling, drag-and-drop upload, document viewer page, TanStack Query hooks, and all loading/empty/error states with the classical library visual treatment.

After this, users can upload documents, files are stored in Vercel Blob, text is extracted, and documents are displayed in a responsive library grid with book/tome metaphor, hover animations, and stagger entrance effects.

---

### Sub-tasks

#### Issue 005 — Document Upload & Storage (Backend)

- [ ] **T1: Install dependencies** — Criteria: `@vercel/blob` and `pdf-parse` added to package.json. `@types/pdf-parse` added as devDependency (if available, otherwise declare module). Lockfile updated. `npm run build` still passes.

- [ ] **T2: Implement format utilities** — Criteria: `src/lib/utils/format.ts` exports `formatDate(date: Date): string` (e.g., "Mar 10, 2026"), `formatFileSize(bytes: number): string` (e.g., "2.4 MB"), and `formatRelativeTime(date: Date): string` (e.g., "3 minutes ago"). All pure functions, no `any` types. These are needed by both API responses and UI components.

- [ ] **T3: Implement PDF parser** — Criteria: `src/lib/parsers/pdf-parser.ts` exports named function `parsePdf(buffer: Buffer): Promise<ParsedDocument>`. Uses `pdf-parse` to extract text from PDF buffer. Returns `{ content, metadata: { title, pageCount } }`. Handles errors gracefully: if parsing fails, throw a descriptive error. Strips excessive whitespace from extracted text. No `export default`.

- [ ] **T4: Implement Markdown parser** — Criteria: `src/lib/parsers/markdown-parser.ts` exports named function `parseMarkdown(content: string): ParsedDocument`. Strips Markdown syntax (headings markers, bold/italic markers, link syntax) to produce clean text. Extracts section titles from headings (# H1, ## H2, etc.) into `metadata.sections`. Detects the first H1 as `metadata.title`. No external dependencies needed — use regex. No `export default`.

- [ ] **T5: Implement plain text parser** — Criteria: `src/lib/parsers/text-parser.ts` exports named function `parseText(content: string): ParsedDocument`. Minimal processing: trim whitespace, normalize line endings. Sets `metadata.title` from first non-empty line (truncated to 200 chars). No `export default`.

- [ ] **T6: Implement URL parser** — Criteria: `src/lib/parsers/url-parser.ts` exports named async function `parseUrl(url: string): Promise<ParsedDocument>`. Fetches the URL content with a timeout (10 seconds). Extracts text from HTML by stripping tags (use regex or basic DOM parsing — no heavy dependency like cheerio). Extracts `<title>` tag as `metadata.title`. Handles fetch errors (network, timeout, non-200 status) with descriptive errors. No `export default`.

- [ ] **T7: Create parser index with dispatcher** — Criteria: `src/lib/parsers/index.ts` exports a named function `extractText(fileType: FileType, content: string | Buffer, sourceUrl?: string): Promise<ParsedDocument>`. Dispatches to the correct parser based on `fileType`. For "pdf", expects `Buffer`. For "md" and "txt", expects `string`. For "url", calls `parseUrl(sourceUrl!)`. Returns `ParsedDocument`. Wraps all parser calls in try/catch — on failure, throws with context (file type, original error message).

- [ ] **T8: Implement POST /api/documents (create + upload)** — Criteria: `src/app/api/documents/route.ts` exports `POST` handler. Auth: `auth()` from `@clerk/nextjs/server` — reject 401 if no userId. Looks up user by clerkId via Prisma to get internal userId. Accepts `multipart/form-data` with fields: `file` (File object) and optional `title`. For URL uploads, accepts JSON body with `{ url, title? }`. Validation: use `uploadFileSchema` for files, `uploadUrlSchema` for URLs. File upload flow: (1) validate file, (2) upload to Vercel Blob via `put()` from `@vercel/blob`, (3) create Document record in Prisma with `status: "processing"`, (4) extract text via `extractText()`, (5) update document with extracted text metadata and `status: "ready"` (or `status: "error"` on failure). URL flow: same but fetch content instead of blob upload. Response: `{ data: Document }` with status 201. Error responses use `{ error: "message" }` envelope.

- [ ] **T9: Implement GET /api/documents (list)** — Criteria: Same route file as T8. Exports `GET` handler. Auth required. Query params: `page` (default 1), `pageSize` (default 20), `status` (optional filter). Fetches documents for the authenticated user via Prisma, ordered by `createdAt` desc. Returns `{ data: Document[], pagination: { total, page, pageSize } }`. Scope to authenticated user's documents only.

- [ ] **T10: Implement GET /api/documents/[id]** — Criteria: `src/app/api/documents/[id]/route.ts` exports `GET` handler. Auth required. Fetches document by ID and verifies it belongs to the authenticated user (403 if not). Returns `{ data: Document }` or `{ error: "Document not found" }` with 404.

- [ ] **T11: Implement PATCH /api/documents/[id]** — Criteria: Same route file as T10. Exports `PATCH` handler. Auth required. Validates body with `updateDocumentSchema`. Updates document fields (title only for now). Verifies ownership. Returns `{ data: Document }` with 200.

- [ ] **T12: Implement DELETE /api/documents/[id]** — Criteria: Same route file as T10. Exports `DELETE` handler. Auth required. Verifies ownership. Deletes Vercel Blob file via `del()` from `@vercel/blob` (if fileUrl exists). Deletes document from Prisma (cascade deletes chunks). Returns 204 with no body.

- [ ] **T13: Add extractedText field handling** — Criteria: The extracted text from parsers needs to be stored for later chunking (issue 007). Add an `extractedText` field to the Document model in Prisma schema (type `String?`, optional). Run `npx prisma db push` or create a migration. Update the POST handler to store extracted text. This field will be consumed by the chunking pipeline in issue 007.

#### Issue 006 — Library UI & Document View (Frontend)

- [ ] **T14: Implement BookTilt motion component** — Criteria: `src/components/motion/book-tilt.tsx` — `"use client"` component. Uses `motion` library. Props: `children`, `className?`, `tiltDegree?: number` (default 3). On hover: subtle scale (1.03) + shadow lift + slight Y rotation for 3D tilt effect. Uses `whileHover` from motion. Transition duration: 300ms with easing `[0.16, 1, 0.3, 1]`. Named export `BookTilt`.

- [ ] **T15: Implement StaggerChildren motion component** — Criteria: `src/components/motion/stagger-children.tsx` — `"use client"` component. Uses `motion` library. Props: `children`, `className?`, `staggerDelay?: number` (default 0.05s), `as?: React.ElementType` (default "div"). Wraps children in a motion container with `staggerChildren` variant. Each child animates from `{ opacity: 0, y: 20 }` to `{ opacity: 1, y: 0 }`. Named export `StaggerChildren`. Also export `StaggerItem` wrapper for individual items.

- [ ] **T16: Implement BookCard component** — Criteria: `src/components/library/book-card.tsx` — `"use client"` component. Props: `document: Document` (from types/database.ts). Displays: spine color bar (left edge, generated from document title hash), serif title (Playfair Display), file type badge, page count or chunk count, relative time since upload. Wraps content in `BookTilt` for hover effect. Uses library theme colors: cream/parchment background, leather borders, warm shadows. Click navigates to `/document/[id]`. Responsive: full width on mobile. Named export `BookCard`.

- [ ] **T17: Implement BookShelf component** — Criteria: `src/components/library/book-shelf.tsx` — `"use client"` component. Props: `documents: Document[]`. Renders a responsive CSS grid: 1 col (mobile), 2 cols (md), 3 cols (lg), 4 cols (xl). Gap: 24px. Wraps grid in `StaggerChildren` for entrance animation. Maps documents to `BookCard` components. Named export `BookShelf`.

- [ ] **T18: Implement EmptyLibrary component** — Criteria: `src/components/library/empty-library.tsx` — component (can be server). Displays when user has no documents. Shows: library illustration or icon (use Lucide `BookOpen` or similar), heading "Your library is empty" (Playfair Display), subtext "Upload your first document to begin building your personal knowledge base", CTA button "Upload a Document" that triggers upload modal/zone. Uses library theme colors. Named export `EmptyLibrary`.

- [ ] **T19: Implement UploadZone component** — Criteria: `src/components/library/upload-zone.tsx` — `"use client"` component. Drag-and-drop file upload area. Props: `onUpload: (file: File) => void`, `onUrlSubmit: (url: string) => void`, `isUploading?: boolean`, `progress?: number`. Visual: dashed border area with "Drop your document here" text and upload icon. Drag states: default, dragover (highlight with gold border), uploading (progress bar). Accepts: PDF, MD, TXT files. Also has a URL input field with submit button for URL imports. Shows upload progress bar when `isUploading` is true. File validation using `uploadFileSchema`. Named export `UploadZone`.

- [ ] **T20: Implement loading skeleton for BookCard** — Criteria: `src/components/library/book-card-skeleton.tsx` — component. Matches BookCard layout with shimmer animation. Uses parchment/cream colors for skeleton blocks. Animate with CSS `@keyframes shimmer` (subtle left-to-right gradient sweep). Named export `BookCardSkeleton`. Also create `BookShelfSkeleton` that renders 8 skeleton cards in the same grid layout. Named export `BookShelfSkeleton`.

- [ ] **T21: Implement useDocuments hook** — Criteria: `src/hooks/queries/use-documents.ts` — `"use client"`. Uses TanStack Query `useQuery` to fetch `GET /api/documents`. Query key: `["documents", { page, status }]`. Returns `{ documents, isLoading, error, refetch }`. Also exports `useCreateDocument` mutation (`useMutation` wrapping `POST /api/documents` with `FormData`), `useDeleteDocument` mutation (`DELETE /api/documents/[id]`). Mutations invalidate `["documents"]` query on success. Named exports only.

- [ ] **T22: Implement useDocumentStatus hook** — Criteria: `src/hooks/queries/use-document-status.ts` — `"use client"`. Uses TanStack Query `useQuery` to fetch `GET /api/documents/[id]`. Query key: `["document", id]`. Enables `refetchInterval: 3000` (3 seconds) ONLY when `document.status === "processing"` (polling stops when status changes to "ready" or "error"). Returns `{ document, isLoading, error }`. Named export `useDocumentStatus`.

- [ ] **T23: Implement useUpload hook** — Criteria: `src/hooks/use-upload.ts` — `"use client"`. Manages file upload lifecycle. Uses `useCreateDocument` mutation internally. Tracks upload progress via `useUIStore.setUploadProgress()`. Returns `{ uploadFile: (file: File, title?: string) => Promise<void>, uploadUrl: (url: string, title?: string) => Promise<void>, isUploading: boolean, progress: number, error: string | null, reset: () => void }`. Validates files before upload using `uploadFileSchema`. Named export `useUpload`.

- [ ] **T24: Implement Library page** — Criteria: `src/app/(dashboard)/library/page.tsx` — `"use client"` page (needs hooks). Uses `useDocuments` hook. Renders: (1) page header with "My Library" title (Playfair Display) and document count, (2) `UploadZone` at top, (3) `BookShelf` with documents OR `EmptyLibrary` if no documents, (4) `BookShelfSkeleton` while loading. Error state: shows error message with retry button. Upload triggers `useUpload` hook. Named export `LibraryPage`. Remove `export default`.

- [ ] **T25: Implement DocumentViewer component** — Criteria: `src/components/library/document-viewer.tsx` — component. Props: `document: Document`. Displays document metadata: title (Playfair Display), file type badge, upload date, status badge (processing/ready/error with appropriate colors). Summary section placeholder (will be populated in issue 009). For now, shows document info card with metadata. Named export `DocumentViewer`.

- [ ] **T26: Implement DocumentSummary component** — Criteria: `src/components/library/document-summary.tsx` — component. Props: `summary: string | null`. If summary exists, displays it in a styled card with a book icon and "Summary" heading. If null, shows placeholder: "Summary will be generated after processing" with a subtle parchment background. Named export `DocumentSummary`.

- [ ] **T27: Implement Document page** — Criteria: `src/app/(dashboard)/document/[id]/page.tsx` — `"use client"` page. Uses `useDocumentStatus` hook to fetch and poll document. Renders: (1) back link to `/library`, (2) `DocumentViewer` with document data, (3) `DocumentSummary` with document summary, (4) processing indicator if status is "processing", (5) error state if status is "error". Loading state: skeleton matching viewer layout. 404 handling if document not found. Named export `DocumentPage`. Remove `export default`.

- [ ] **T28: Implement BookSpine component** — Criteria: `src/components/library/book-spine.tsx` — component. Props: `title: string`, `color: string`. Renders a narrow vertical "spine" view for potential sidebar display. Shows title rotated vertically, colored spine band. This is a simpler variant of BookCard for compact views. Named export `BookSpine`.

---

### Data Flow

#### Issue 005 — Document Upload & Storage

```
Client (FormData) → POST /api/documents
  → auth() → clerkId → prisma.user.findUnique({ clerkId })
  → uploadFileSchema.safeParse(file)
  → put(file, { access: "public" }) → Vercel Blob URL
  → prisma.document.create({ title, fileUrl, fileType, status: "processing" })
  → extractText(fileType, buffer/content, sourceUrl?)
    → parsePdf(buffer) | parseMarkdown(content) | parseText(content) | parseUrl(url)
    → ParsedDocument { content, metadata }
  → prisma.document.update({ extractedText, status: "ready", ... })
  → Response: { data: Document } (201)

Error flow:
  → extractText throws → prisma.document.update({ status: "error" })
  → Response: { data: Document } (201, with status: "error")

Client → GET /api/documents?page=1&pageSize=20
  → auth() → clerkId → prisma user lookup
  → prisma.document.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })
  → Response: { data: Document[], pagination: { total, page, pageSize } }

Client → GET /api/documents/[id]
  → auth() → ownership check
  → prisma.document.findUnique({ id })
  → Response: { data: Document }

Client → PATCH /api/documents/[id]
  → auth() → ownership check
  → updateDocumentSchema.safeParse(body)
  → prisma.document.update({ title })
  → Response: { data: Document }

Client → DELETE /api/documents/[id]
  → auth() → ownership check
  → del(document.fileUrl) → remove from Vercel Blob
  → prisma.document.delete({ id }) → cascades to chunks
  → Response: 204
```

#### Issue 006 — Library UI & Document View

```
LibraryPage
├── useDocuments() → GET /api/documents → { documents, isLoading, error }
├── useUpload() → { uploadFile, uploadUrl, isUploading, progress }
│   └── useCreateDocument() → POST /api/documents (FormData)
│       └── onSuccess → invalidateQueries(["documents"])
├── Rendering states:
│   ├── isLoading → BookShelfSkeleton (8 cards, shimmer animation)
│   ├── error → Error card with retry button
│   ├── documents.length === 0 → EmptyLibrary
│   └── documents.length > 0 → BookShelf → BookCard[] (in StaggerChildren)
└── UploadZone
    ├── onUpload(file) → useUpload().uploadFile(file)
    ├── onUrlSubmit(url) → useUpload().uploadUrl(url)
    └── progress → useUIStore.uploadProgress

DocumentPage (/document/[id])
├── useDocumentStatus(id) → GET /api/documents/[id]
│   └── refetchInterval: 3000 (while status === "processing")
├── Rendering states:
│   ├── isLoading → Skeleton
│   ├── error / not found → Error state
│   ├── status === "processing" → Processing indicator
│   └── status === "ready" → DocumentViewer + DocumentSummary
└── Back link → /library

Component hierarchy:
BookShelf
├── StaggerChildren (grid wrapper)
│   └── StaggerItem[] → BookTilt → BookCard
│       ├── Spine color bar (hashed from title)
│       ├── Title (Playfair Display)
│       ├── File type badge
│       ├── Chunk/page count
│       └── Relative time
└── CSS Grid: 1col → 2col (md) → 3col (lg) → 4col (xl)
```

---

### Files to Create/Modify

#### Issue 005

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `@vercel/blob`, `pdf-parse`, `@types/pdf-parse` (dev) |
| `prisma/schema.prisma` | Modify | Add `extractedText String?` field to Document model |
| `src/lib/utils/format.ts` | Modify | Implement formatDate, formatFileSize, formatRelativeTime |
| `src/lib/parsers/pdf-parser.ts` | Modify | Implement PDF text extraction with pdf-parse |
| `src/lib/parsers/markdown-parser.ts` | Modify | Implement Markdown text extraction with regex |
| `src/lib/parsers/text-parser.ts` | Modify | Implement plain text extraction |
| `src/lib/parsers/url-parser.ts` | Modify | Implement URL content fetching and text extraction |
| `src/lib/parsers/index.ts` | Create | Parser dispatcher: extractText(fileType, content, sourceUrl?) |
| `src/app/api/documents/route.ts` | Modify | Implement POST (create + upload) and GET (list) handlers |
| `src/app/api/documents/[id]/route.ts` | Modify | Implement GET, PATCH, DELETE handlers |

#### Issue 006

| File | Action | Description |
|------|--------|-------------|
| `src/components/motion/book-tilt.tsx` | Modify | Implement 3D tilt hover effect with motion |
| `src/components/motion/stagger-children.tsx` | Modify | Implement stagger entrance animation with motion |
| `src/components/library/book-card.tsx` | Modify | Implement tome-styled document card |
| `src/components/library/book-card-skeleton.tsx` | Create | Loading skeleton for BookCard + BookShelfSkeleton |
| `src/components/library/book-shelf.tsx` | Modify | Implement responsive grid with stagger animation |
| `src/components/library/book-spine.tsx` | Modify | Implement compact spine view |
| `src/components/library/empty-library.tsx` | Modify | Implement empty state with CTA |
| `src/components/library/upload-zone.tsx` | Modify | Implement drag-and-drop upload with progress |
| `src/components/library/document-viewer.tsx` | Modify | Implement document metadata display |
| `src/components/library/document-summary.tsx` | Modify | Implement summary display (placeholder for now) |
| `src/hooks/queries/use-documents.ts` | Modify | Implement TanStack Query hooks for document CRUD |
| `src/hooks/queries/use-document-status.ts` | Modify | Implement polling hook for document status |
| `src/hooks/use-upload.ts` | Modify | Implement upload lifecycle hook with progress |
| `src/app/(dashboard)/library/page.tsx` | Modify | Full library page with all states |
| `src/app/(dashboard)/document/[id]/page.tsx` | Modify | Full document viewer page with polling |

---

### Standards to Consult

- `docs/standards/CODE_STANDARDS.md` — Sections: TypeScript Strict Rules (no `any`), Naming Conventions (named exports, PascalCase components, camelCase functions), Import Organization, Error Handling (structured API errors, `console.error("[Module]")` pattern)
- `docs/standards/UI_STANDARDS.md` — Sections: Color System (light + dark mode tokens), Typography (Playfair Display headings, Lora body, Inter UI), Shadows (warm brown rgba), Animations (300ms normal, 50ms stagger, easing curve), Component Patterns (loading skeletons, empty states, error states), Responsive Breakpoints (md: 768, lg: 1024, xl: 1280)
- `docs/standards/API_STANDARDS.md` — Sections: Route Structure, CRUD Patterns (POST 201, GET 200, PATCH 200, DELETE 204), Response Envelope (`{ data }` / `{ error }`), Validation (Zod safeParse on every request), Authentication (Clerk `auth()` on every route, scope queries to user)
- `docs/standards/TESTING_STANDARDS.md` — Section: Priority Tests (parsers are high priority — structure code for testability with pure functions, dependency injection where possible)

---

### Decisions

1. **Combined issues 005 + 006 on one branch** — 005 (API + storage) produces the backend that 006 (UI) consumes. They form a complete vertical slice: upload → store → display. Single PR reduces overhead and allows testing the full flow.

2. **Synchronous text extraction in POST handler** — For simplicity at this stage, text extraction runs synchronously within the POST /api/documents handler. The document starts as `"processing"`, extraction runs, then status updates to `"ready"` or `"error"`. This is acceptable because: (a) files are max 10MB, (b) free tier has low concurrency, (c) background jobs would require additional infrastructure (queues). If extraction takes too long, the client sees `"processing"` status and the polling hook (T22) will pick up the final status. The text extraction + status update happens in a try/catch after the initial 201 response is NOT sent — we wait for extraction to complete before responding.

3. **extractedText field on Document model** — The parsers produce extracted text that the chunking pipeline (issue 007) will consume. Rather than re-parsing files from Vercel Blob, store the extracted text directly on the Document. This field is `String?` (nullable) and will be large for big documents. Alternative considered: storing in a separate table — rejected for simplicity at this stage.

4. **No cheerio for URL parsing** — To keep dependencies minimal, URL text extraction uses regex-based HTML tag stripping rather than a full DOM parser. This is sufficient for extracting readable text from web pages. If quality is poor, cheerio can be added later.

5. **Spine color generated from title hash** — Each BookCard shows a colored spine bar on the left edge. The color is deterministically generated from a hash of the document title, selecting from a predefined palette of warm library colors (burgundy, forest green, navy, brown, gold, etc.). This avoids needing a color picker or random assignment.

6. **Upload via FormData, not JSON** — File uploads use `multipart/form-data` because `File` objects cannot be sent in JSON. URL imports use JSON body `{ url, title? }`. The POST handler differentiates by checking `Content-Type` header.

7. **Vercel Blob `put()` with public access** — Files are uploaded with `access: "public"` to Vercel Blob. This generates a public URL that can be used directly. For a portfolio project with no sensitive data requirements, public access is acceptable. The URL is stored in `document.fileUrl`.

8. **Delete cascades** — Deleting a document cascades to chunks (Prisma schema already defines `onDelete: Cascade`). The API route also explicitly deletes the Vercel Blob file. Conversations linked to the document are NOT deleted (relation uses `onDelete: SetNull`).

9. **Upload progress tracking** — True upload progress requires `XMLHttpRequest` or `fetch` with `ReadableStream` monitoring. For simplicity, `useUpload` will use a simulated progress approach: set to 30% when upload starts, 60% when blob upload completes, 90% during text extraction, 100% on success. This provides visual feedback without complexity. Zustand `ui-store.uploadProgress` tracks the value.

10. **BookCard click navigation** — BookCard uses Next.js `<Link>` for navigation to `/document/[id]`. No client-side routing state needed — the document page fetches its own data via `useDocumentStatus`.

---

### Edge Cases

- **PDF parsing failure** — Some PDFs are image-only (scanned) and produce empty text. If `parsePdf` returns empty content, set `extractedText` to empty string and `status: "ready"` (the document exists but has no extractable text). Log a warning: `console.warn("[Parsers] PDF produced empty text")`.
- **URL fetch timeout** — `parseUrl` uses `AbortController` with 10-second timeout. On timeout, throw a descriptive error that results in `status: "error"`.
- **URL fetch non-HTML content** — If the fetched URL returns non-HTML content (e.g., a direct PDF link), detect by Content-Type header. If it's a PDF, pass the buffer to `parsePdf`. Otherwise, attempt text extraction as plain text.
- **Large file upload** — Files over 10MB are rejected by `uploadFileSchema` on the client. The API route should also validate file size server-side as a safety net.
- **Vercel Blob deletion failure** — If `del()` fails when deleting a document (blob already gone, network error), log the error but still delete the database record. Don't fail the DELETE request over a blob cleanup issue.
- **Concurrent uploads** — Multiple uploads are handled independently. Each creates its own Document record. The UI shows progress for the most recent upload via `uploadProgress` in ui-store.
- **Document not found on detail page** — `useDocumentStatus` returns 404 → show "Document not found" with a link back to library.
- **User has no documents** — `useDocuments` returns empty array → render `EmptyLibrary` component.
- **Polling stops on unmount** — TanStack Query automatically cancels polling when the component unmounts (via `refetchInterval` + query lifecycle). No manual cleanup needed.
- **Drag-and-drop invalid file type** — `UploadZone` validates dropped files against `ALLOWED_FILE_TYPES`. If invalid, show inline error message "Only PDF, Markdown, and plain text files are allowed".
- **Auth token expired mid-upload** — Clerk middleware handles token refresh. If auth fails during API call, TanStack Query's error handling surfaces the 401.
- **Dark mode styling** — All components use CSS variables / Tailwind semantic tokens. BookCard, BookShelf, UploadZone, and skeletons must look correct in both light and dark modes. Test both themes.
- **Hydration mismatch on relative time** — `formatRelativeTime` produces different results on server vs client (time difference). Use `"use client"` on components displaying relative time, or render time in `useEffect`.

---

### Required Tests

> **Note:** Vitest and Playwright are not yet installed (deferred to issue 012). Code should be structured for testability — pure functions, separated concerns, mockable boundaries.

- [ ] Unit: `src/lib/parsers/pdf-parser.test.ts` — Verifies text extraction from a sample PDF buffer, handles empty PDFs, handles corrupt buffers
- [ ] Unit: `src/lib/parsers/markdown-parser.test.ts` — Verifies heading extraction, markdown stripping, section detection
- [ ] Unit: `src/lib/parsers/text-parser.test.ts` — Verifies whitespace normalization, title extraction from first line
- [ ] Unit: `src/lib/parsers/url-parser.test.ts` — Verifies HTML tag stripping, title extraction, timeout handling (mock fetch)
- [ ] Unit: `src/lib/utils/format.test.ts` — Verifies formatDate, formatFileSize, formatRelativeTime outputs
- [ ] Integration: `src/app/api/documents/route.test.ts` — Full POST/GET request cycle with mocked auth and Prisma
- [ ] Integration: `src/app/api/documents/[id]/route.test.ts` — GET/PATCH/DELETE with ownership checks
- [ ] Manual: Upload a PDF file → document appears in library with "processing" then "ready" status
- [ ] Manual: Upload a Markdown file → text extracted correctly
- [ ] Manual: Upload a plain text file → text extracted correctly
- [ ] Manual: Submit a URL → content fetched and extracted
- [ ] Manual: Delete a document → removed from library and Vercel Blob
- [ ] Manual: Library page shows loading skeleton on first load
- [ ] Manual: Empty library shows EmptyLibrary component
- [ ] Manual: BookCard hover effect works (scale + shadow)
- [ ] Manual: Responsive grid: 1→2→3→4 columns at breakpoints
- [ ] Manual: Dark mode renders correctly for all components
- [ ] Manual: `npm run build` passes with zero errors
- [ ] Manual: `npm run lint` passes with zero warnings

---

### Implementation Order

The Coder should implement sub-tasks in this exact order:

**Phase A — Dependencies & Utilities (Setup)**

1. **T1** — Install `@vercel/blob`, `pdf-parse`, `@types/pdf-parse`
2. **T2** — Implement format utilities (formatDate, formatFileSize, formatRelativeTime)
3. **T13** — Add `extractedText` field to Prisma Document model

**Phase B — Text Parsers (Issue 005 core)**

4. **T5** — Implement plain text parser (simplest, establishes pattern)
5. **T4** — Implement Markdown parser
6. **T3** — Implement PDF parser
7. **T6** — Implement URL parser
8. **T7** — Create parser index with dispatcher

**Phase C — API Routes (Issue 005 core)**

9. **T8** — Implement POST /api/documents (create + upload)
10. **T9** — Implement GET /api/documents (list)
11. **T10** — Implement GET /api/documents/[id]
12. **T11** — Implement PATCH /api/documents/[id]
13. **T12** — Implement DELETE /api/documents/[id]

**Phase D — Motion Components (Issue 006 foundation)**

14. **T14** — Implement BookTilt motion component
15. **T15** — Implement StaggerChildren motion component

**Phase E — Library Components (Issue 006 UI)**

16. **T16** — Implement BookCard component
17. **T20** — Implement BookCardSkeleton + BookShelfSkeleton
18. **T17** — Implement BookShelf component
19. **T18** — Implement EmptyLibrary component
20. **T19** — Implement UploadZone component
21. **T28** — Implement BookSpine component

**Phase F — Hooks (Issue 006 data layer)**

22. **T21** — Implement useDocuments hook (CRUD + mutations)
23. **T22** — Implement useDocumentStatus hook (polling)
24. **T23** — Implement useUpload hook (upload lifecycle)

**Phase G — Pages (Issue 006 integration)**

25. **T25** — Implement DocumentViewer component
26. **T26** — Implement DocumentSummary component
27. **T27** — Implement Document page (/document/[id])
28. **T24** — Implement Library page (/library) — last because it integrates everything

---

### API Route Reference

#### POST /api/documents

```typescript
// Request (file upload): multipart/form-data
// Fields: file (File), title? (string)

// Request (URL import): application/json
// Body: { url: string, title?: string }

// Response: 201
{
  "data": {
    "id": "cuid...",
    "userId": "cuid...",
    "title": "Document Title",
    "originalName": "file.pdf",
    "fileUrl": "https://blob.vercel-storage.com/...",
    "fileType": "pdf",
    "summary": null,
    "extractedText": "Full extracted text...",
    "totalChunks": 0,
    "status": "ready",
    "createdAt": "2026-03-10T...",
    "updatedAt": "2026-03-10T..."
  }
}

// Error: 400
{ "error": "File must be 10MB or smaller" }

// Error: 401
{ "error": "Unauthorized" }
```

#### GET /api/documents

```typescript
// Query params: ?page=1&pageSize=20&status=ready

// Response: 200
{
  "data": [{ ...Document }],
  "pagination": {
    "total": 42,
    "page": 1,
    "pageSize": 20
  }
}
```

#### GET /api/documents/[id]

```typescript
// Response: 200
{ "data": { ...Document } }

// Error: 404
{ "error": "Document not found" }

// Error: 403
{ "error": "Forbidden" }
```

#### PATCH /api/documents/[id]

```typescript
// Request: application/json
// Body: { title?: string }

// Response: 200
{ "data": { ...Document } }
```

#### DELETE /api/documents/[id]

```typescript
// Response: 204 (no body)

// Error: 404
{ "error": "Document not found" }
```

---

### Spine Color Palette

Deterministic color assignment for BookCard spines, selected by hashing document title:

```typescript
const SPINE_COLORS = [
  "#8B0000", // Dark red (burgundy)
  "#2E4057", // Dark navy
  "#4A5D23", // Forest green
  "#8B4513", // Saddle brown
  "#4A0E4E", // Deep purple
  "#1B4332", // Dark emerald
  "#7B3F00", // Chocolate
  "#2C3E50", // Midnight blue
  "#6B3A2A", // Russet
  "#3C1414", // Dark maroon
] as const;

function getSpineColor(title: string): string {
  const hash = title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return SPINE_COLORS[hash % SPINE_COLORS.length];
}
```

---

### Component Wireframes

#### BookCard

```
┌──┬──────────────────────┐
│  │ Document Title        │  ← Playfair Display, truncate 2 lines
│S │                       │
│P │ PDF · 12 pages        │  ← Inter, muted text
│I │                       │
│N │           3 min ago   │  ← Inter, leather color
│E │                       │
└──┴──────────────────────┘
     ↑ warm shadow, rounded corners
     hover: scale(1.03) + shadow lift
```

#### UploadZone

```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
│                                   │
│        📤 Upload Icon             │  ← Lucide Upload icon
│                                   │
│   Drop your document here         │  ← Lora, secondary text
│   or click to browse              │
│                                   │
│   PDF, Markdown, Plain Text       │  ← Inter, muted
│   Max 10MB                        │
│                                   │
│  ┌─────────────────────────────┐  │
│  │ https://...          [Add]  │  │  ← URL import input
│  └─────────────────────────────┘  │
│                                   │
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
     ↑ dashed border, parchment bg
     dragover: gold border, highlight
```

#### Library Page Layout

```
┌─────────────────────────────────────────┐
│ My Library                    12 tomes  │  ← Header area
├─────────────────────────────────────────┤
│ ┌─ ─ ─ ─ ─ Upload Zone ─ ─ ─ ─ ─┐     │
│ └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘     │
│                                         │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐           │  ← Responsive grid
│ │Book│ │Book│ │Book│ │Book│           │
│ │Card│ │Card│ │Card│ │Card│           │
│ └────┘ └────┘ └────┘ └────┘           │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐           │
│ │Book│ │Book│ │Book│ │Book│           │
│ │Card│ │Card│ │Card│ │Card│           │
│ └────┘ └────┘ └────┘ └────┘           │
└─────────────────────────────────────────┘
```
