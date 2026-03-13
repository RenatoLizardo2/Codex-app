# Review: Issues 005 & 006 — Document Upload, Storage & Library UI

**Branch:** `feat/005-006-documents-library`
**Plan:** `docs/plans/plan-005-006-documents-library.md`
**Reviewer:** Reviewer Agent
**Date:** 2026-03-13
**Verdict:** **APPROVE** (with minor issues noted below — none are blocking)

---

## Build & Lint

- `npm run build` — **PASS** (zero errors, compiled successfully)
- `npm run lint` — **PASS** (zero warnings/errors)

---

## Per-Task Checklist

### Issue 005 — Backend

| Task | Status | Notes |
|------|--------|-------|
| **T1: Install dependencies** | PASS | `@vercel/blob`, `pdf-parse` in dependencies; `@types/pdf-parse` in devDependencies. Build passes. |
| **T2: Format utilities** | PASS | `formatDate`, `formatFileSize`, `formatRelativeTime` all implemented as pure functions. No `any`. Named exports. Constants use SCREAMING_SNAKE_CASE. Handles edge cases (0 bytes, future dates, years). |
| **T3: PDF parser** | PASS | Uses `pdf-parse` v2 API (`PDFParse` class). Named export. Returns `ParsedDocument`. Strips excess whitespace. Logs warning on empty text. Calls `parser.destroy()` for cleanup. |
| **T4: Markdown parser** | PASS | Regex-based stripping of all Markdown syntax. Extracts sections from headings. First H1 as title. No external dependencies. Named export. |
| **T5: Text parser** | PASS | Normalizes line endings, trims whitespace, extracts title from first non-empty line (truncated to 200 chars). Named export. |
| **T6: URL parser** | PASS | `AbortController` with 10s timeout. Strips HTML via regex. Extracts `<title>`. Handles PDF content-type (dynamic import of `parsePdf`). Descriptive timeout error. Named export. |
| **T7: Parser index** | PASS | `extractText` dispatches by `FileType`. Type-safe exhaustive switch. Try/catch wraps all parsers with context in error message. Named exports. |
| **T8: POST /api/documents** | PASS | Auth via `auth()`, clerkId → user lookup. FormData for files, JSON for URLs. Validates with `uploadFileSchema`/`uploadUrlSchema`. Uploads to Vercel Blob with `access: "public"`. Creates document with `status: "processing"`, extracts text, updates to `"ready"` or `"error"`. Response: `{ data }` with 201. |
| **T9: GET /api/documents** | PASS | Auth required. Query params: `page`, `pageSize`, `status` filter. Scoped to user. Ordered by `createdAt` desc. Response: `{ data, pagination }`. |
| **T10: GET /api/documents/[id]** | PASS | Auth required. Ownership check (404 if not found, 403 if not owner). Response: `{ data }`. |
| **T11: PATCH /api/documents/[id]** | PASS | Auth + ownership. Validates with `updateDocumentSchema`. Returns `{ data }` with 200. |
| **T12: DELETE /api/documents/[id]** | PASS | Auth + ownership. Deletes blob (with try/catch, logs error but continues). Deletes document. Returns 204. Correctly skips blob deletion for URL type documents. |
| **T13: extractedText field** | PASS | `extractedText String?` added to Document model in Prisma schema. POST handler stores extracted text. TypeScript type updated in `database.ts`. |

### Issue 006 — Frontend

| Task | Status | Notes |
|------|--------|-------|
| **T14: BookTilt** | PASS | `"use client"`. Uses `motion/react`. `whileHover` with scale(1.03) + rotateY + shadow lift. Duration 300ms, easing `[0.16, 1, 0.3, 1]`. Named export. `transformStyle: "preserve-3d"` for 3D effect. |
| **T15: StaggerChildren** | PASS | `"use client"`. `staggerChildren` variant with `useMemo`. `StaggerItem` with `hidden → visible` animation. Named exports for both. |
| **T16: BookCard** | PASS | `"use client"`. Spine color from title hash using plan's palette. Playfair Display via `font-heading`. File type badge with icon. Relative time. Wraps in `BookTilt`. Navigates via `Link` to `/document/[id]`. Named export. |
| **T17: BookShelf** | PASS | `"use client"`. Responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`. Gap: `gap-6` (24px). Wraps in `StaggerChildren` + `StaggerItem`. Named export. |
| **T18: EmptyLibrary** | PASS | Server component (no `"use client"`). Uses `BookOpen` icon. Heading "Your library is empty" (font-heading). Subtext. CTA button. Library theme colors (semantic tokens). Named export. |
| **T19: UploadZone** | PASS | `"use client"`. Drag-and-drop with all states (default, dragover, uploading). File validation (type + size). URL input with submit. Progress bar. Accessible (role="button", tabIndex, keyboard handler). Named export. |
| **T20: BookCardSkeleton** | PASS | Matches BookCard layout. Shimmer animation via CSS `@keyframes shimmer`. `BookShelfSkeleton` renders 8 skeletons in same grid. Both named exports. |
| **T21: useDocuments** | PASS | `"use client"`. TanStack Query. Query key: `["documents", { page, status }]`. Returns shaped object. `useCreateDocument` and `useDeleteDocument` mutations invalidate `["documents"]`. Also includes `useCreateDocumentFromUrl` (bonus). Named exports. |
| **T22: useDocumentStatus** | PASS | `"use client"`. `refetchInterval` returns 3000 only when `status === "processing"`, `false` otherwise. Handles 404. Named export. |
| **T23: useUpload** | PASS | `"use client"`. Uses `useCreateDocument` + `useCreateDocumentFromUrl`. Simulated progress (30→60→100). Validates files. Uses `useUIStore.setUploadProgress`. Returns full API: `uploadFile`, `uploadUrl`, `isUploading`, `progress`, `error`, `reset`. Named export. |
| **T24: Library page** | PASS | `"use client"`. Uses `useDocuments` + `useUpload`. Header "My Library" with count. UploadZone. Loading → BookShelfSkeleton. Error → retry button. Empty → EmptyLibrary. Data → BookShelf. Uses `export default` (required by Next.js). |
| **T25: DocumentViewer** | PASS | Server component. File type badge, status badge (processing/ready/error with colors + icons), upload date, chunk count. Named export. |
| **T26: DocumentSummary** | PASS | Server component. Summary text or placeholder with parchment background. BookOpen icon. Named export. |
| **T27: Document page** | PASS | `"use client"`. Uses `useDocumentStatus` with polling. Back link to `/library`. Loading skeleton. Error/not-found state with link back. Processing indicator. DocumentViewer + DocumentSummary. Uses `export default` (required by Next.js). |
| **T28: BookSpine** | PASS | Server component. Vertical title with `writing-mode: vertical-rl`. Color prop. Named export. |

---

## Issues Found

### Minor

1. **~~`rag.ts` uses `interface` instead of `type`~~** — **FIXED**: Converted all `interface` declarations to `type` with intersection types for extends.

2. **~~`StaggerChildren` missing `as` prop~~** — **FIXED**: Added `as?: React.ElementType` prop (default `"div"`) using `motion.create()`.

3. **Page exports use `export default`** (Severity: nit)
   - Plan says "Remove `export default`" for T24 and T27
   - Implementation uses `export default` which is **correct** — Next.js App Router requires `export default` for page components
   - The plan's instruction was incorrect; the implementation is right.

4. **`DocumentViewer` uses `text-ink-green` class** (Severity: nit)
   - File: `src/components/library/document-viewer.tsx:25`
   - `text-ink-green` is used for the "Ready" status — this references `--color-ink-green` from the theme which is defined in `globals.css`, so it does work correctly with Tailwind v4's `@theme` block.

5. **Hardcoded box-shadow in BookTilt** (Severity: nit)
   - `boxShadow: "0 8px 30px rgba(62, 39, 35, 0.2)"` in the `whileHover` — this is acceptable since Motion's `whileHover` requires inline styles and can't use CSS variables directly.

6. **~~Duplicate validation constants~~** — **FIXED**: Exported `ALLOWED_MIME_TYPES` and `MAX_FILE_SIZE` from `src/lib/validations/upload.ts` and imported in `upload-zone.tsx`, `use-upload.ts`, and `api/documents/route.ts`.

### Suggestions (Non-blocking)

1. **Consider `prefers-reduced-motion`** — BookTilt and StaggerChildren don't check `prefers-reduced-motion`. The UI_STANDARDS mention this. Can be addressed in issue 011 (advanced animations).

2. **Gap value** — Plan says "Gap: 24px" for BookShelf. Implementation uses `gap-6` which is 24px in Tailwind's default scale. Correct.

3. **Code testability** — Parsers are well-structured as pure functions. Format utilities are pure. API routes separate auth/ownership into helper functions. Good testability posture for issue 012.

---

## Standards Compliance Summary

| Standard | Status | Notes |
|----------|--------|-------|
| **No `any` types** | PASS | Zero `any` found across all files |
| **Named exports** | PASS | All components/hooks/utils use named exports. Pages use `export default` (required by Next.js) |
| **`"use client"` only where needed** | PASS | Only on components with hooks/event handlers. Server components correctly omit it |
| **API `{ data }` / `{ error }` envelope** | PASS | All API routes use correct envelope |
| **Auth on all routes** | PASS | `auth()` on every handler, user lookup by clerkId, queries scoped to user |
| **Ownership checks** | PASS | GET/PATCH/DELETE on `[id]` routes verify `document.userId === user.id` |
| **Loading/empty/error states** | PASS | Library page, Document page both handle all three states |
| **Semantic tokens (no hardcoded colors)** | PASS | All CSS classes use Tailwind semantic tokens (`bg-card`, `text-foreground`, etc.) |
| **Responsive grid** | PASS | `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` |
| **Import paths `@/src/...`** | PASS | All internal imports use `@/src/` alias |
| **Naming conventions** | PASS | PascalCase components, camelCase functions, SCREAMING_SNAKE_CASE constants |
| **Zod validation** | PASS | `uploadFileSchema`, `uploadUrlSchema`, `updateDocumentSchema` used for validation |
| **Error handling** | PASS | `console.error("[Module]")` pattern followed. Errors not swallowed silently |
| **Typography** | PASS | `font-heading` for headings, `font-body` for body, `font-ui` for labels |
| **Edge cases from plan** | PASS | PDF empty text warning, URL timeout, blob deletion failure handling, file size validation, invalid file type, drag-and-drop invalid files |

---

## Conclusion

The implementation is thorough and closely follows the plan. All 28 sub-tasks are implemented correctly. Build and lint pass cleanly. The code follows project conventions, uses proper typing, semantic tokens, and handles all three UI states (loading, empty, error). The minor issues found are non-blocking and can be addressed in future iterations.

**Verdict: APPROVE — Ready to merge.**
