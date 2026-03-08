## Feature: Design System, Theming & Auth

File: docs/plans/plan-001-002-foundations-design-auth.md
Issues: 001-design-system-and-theming, 002-auth-and-user-sync
Date: 2026-03-08
Phase: 0
Status: Planned

### Objective

Establish the visual foundation (design tokens, fonts, shadcn/ui, dark mode) and authentication layer (Clerk middleware, auth pages, webhook user sync) so the app boots with the full classical library theme and protected routes.

---

### Sub-tasks

#### Issue 001 — Design System & Theming

- [ ] **T1: Install shared dependencies** — Criteria: `clsx`, `tailwind-merge`, `zod` added to package.json and lockfile updated
- [ ] **T2: Consolidate root layout to `src/app/`** — Criteria: root `app/` layout/page replaced by redirect or removed; `src/app/layout.tsx` is the single root layout with `next/font/google` loading Playfair Display (700), Lora (400, 700), Inter (400, 500, 600), JetBrains Mono (400). CSS variables set on `<html>`. Metadata includes site name and description from `siteConfig`.
- [ ] **T3: Create `src/app/globals.css` with design tokens** — Criteria: All color tokens from UI_STANDARDS (light mode "The Library" + dark mode "Library at Night") defined as CSS custom properties on `:root` and `.dark`. Semantic shadcn mappings (`--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--card`, `--popover`, `--border`, `--input`, `--ring`) all mapped to library palette. Shadow tokens (`--shadow-card`, `--shadow-elevated`), border-radius tokens. Tailwind v4 `@theme` block exposing all tokens.
- [ ] **T4: Implement `src/lib/utils/cn.ts`** — Criteria: Named export `cn()` using `clsx` + `twMerge`. No default export.
- [ ] **T5: Initialize shadcn/ui** — Criteria: `components.json` created at project root with: style "default", tailwindCSS config pointing to globals.css, aliases matching `@/*` path alias, RSC enabled. At least one shadcn component installed (`button`) to verify pipeline works.
- [ ] **T6: Delete default Next.js root `app/` directory** — Criteria: `app/layout.tsx`, `app/page.tsx`, `app/globals.css` and any default favicon/fonts removed. Only `src/app/` remains as the app root.

#### Issue 002 — Auth & User Sync

- [ ] **T7: Install auth dependencies** — Criteria: `@clerk/nextjs`, `svix` added to package.json
- [ ] **T8: Create Clerk middleware** — Criteria: `src/middleware.ts` exports clerkMiddleware. Public routes: `/`, `/sign-in(.*)`, `/sign-up(.*)`, `/api/webhooks/(.*)`. All other routes protected. Matcher config excludes static files and `_next`.
- [ ] **T9: Wrap app with ClerkProvider** — Criteria: `src/app/layout.tsx` wraps children with `<ClerkProvider>`. Import from `@clerk/nextjs`.
- [ ] **T10: Create auth layout** — Criteria: `src/app/(auth)/layout.tsx` — centered flex layout, parchment background (`bg-[hsl(var(--background))]`), renders children centered vertically and horizontally.
- [ ] **T11: Create sign-in page** — Criteria: `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` renders `<SignIn />` from `@clerk/nextjs`. Routing set to hash-based or path-based as appropriate. Page has proper metadata.
- [ ] **T12: Create sign-up page** — Criteria: `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` renders `<SignUp />` from `@clerk/nextjs`. Same pattern as sign-in.
- [ ] **T13: Implement Clerk webhook route** — Criteria: `src/app/api/webhooks/clerk/route.ts` — POST handler that: (1) reads `CLERK_WEBHOOK_SECRET` from env, (2) verifies Svix signature from headers (`svix-id`, `svix-timestamp`, `svix-signature`), (3) parses body with Zod schema, (4) handles `user.created`, `user.updated`, `user.deleted` events, (5) returns 200 on success, 400 on invalid payload, 401 on bad signature. For now, handler logs events (Prisma integration deferred to issue 003).
- [ ] **T14: Add `CLERK_WEBHOOK_SECRET` to `.env.example`** — Criteria: Variable added with descriptive comment

#### Shared Contracts

- [ ] **T15: Create `src/lib/validations/user.ts`** — Criteria: Zod schemas for Clerk webhook event payload (`clerkWebhookEventSchema`). Types derived with `z.infer<>`. Named exports only.
- [ ] **T16: Update `src/lib/validations/document.ts`** — Criteria: Basic Zod schemas: `createDocumentSchema` (title required, fileType enum), `updateDocumentSchema` (partial of create). Types derived with `z.infer<>`.
- [ ] **T17: Update `src/lib/validations/chat.ts`** — Criteria: Basic Zod schemas: `createConversationSchema`, `sendMessageSchema` (content required, conversationId). Types derived with `z.infer<>`.
- [ ] **T18: Update `src/lib/validations/upload.ts`** — Criteria: Basic Zod schemas: `uploadFileSchema` (file size max 10MB, allowed types: pdf, md, txt), `uploadUrlSchema` (valid URL string). Types derived with `z.infer<>`.

---

### Data Flow

#### Design System (Issue 001)

No data flow — this is configuration and utility code:

```
globals.css (tokens) -> Tailwind v4 (@theme) -> components
layout.tsx (fonts) -> CSS variables -> all pages
cn.ts -> used by all components for conditional classes
shadcn/ui -> components/ui/ primitives
```

#### Auth & User Sync (Issue 002)

```
Browser -> Clerk middleware (src/middleware.ts) -> route allowed or redirected to /sign-in
Clerk Dashboard -> Webhook POST /api/webhooks/clerk -> Svix verify -> Zod parse -> log (Prisma in 003)
```

---

### Files to Create/Modify

#### Create

| File | Description |
|------|-------------|
| `src/app/layout.tsx` | Root layout with fonts, metadata, ClerkProvider |
| `src/app/globals.css` | Design tokens (light + dark), Tailwind v4 @theme, shadcn semantic vars |
| `src/lib/utils/cn.ts` | `cn()` helper — clsx + tailwind-merge |
| `components.json` | shadcn/ui configuration |
| `src/components/ui/button.tsx` | First shadcn component (verify pipeline) |
| `src/middleware.ts` | Clerk middleware with public/protected route config |
| `src/app/(auth)/layout.tsx` | Centered auth layout with parchment background |
| `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Clerk SignIn component |
| `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Clerk SignUp component |
| `src/app/api/webhooks/clerk/route.ts` | Clerk webhook handler with Svix verification |
| `src/lib/validations/user.ts` | Clerk webhook Zod schemas |

#### Modify

| File | Change |
|------|--------|
| `package.json` | Add clsx, tailwind-merge, zod, @clerk/nextjs, svix |
| `.env.example` | Add CLERK_WEBHOOK_SECRET |
| `src/lib/validations/document.ts` | Add createDocumentSchema, updateDocumentSchema |
| `src/lib/validations/chat.ts` | Add createConversationSchema, sendMessageSchema |
| `src/lib/validations/upload.ts` | Add uploadFileSchema, uploadUrlSchema |

#### Delete

| File | Reason |
|------|--------|
| `app/layout.tsx` | Replaced by `src/app/layout.tsx` |
| `app/page.tsx` | Default Next.js page — not needed |
| `app/globals.css` | Replaced by `src/app/globals.css` |
| `app/favicon.ico` | Move to `src/app/` or `public/` |

---

### Design Tokens Reference

#### Light Mode — "The Library"

```css
--wood-dark: 10 31% 19%;       /* #3E2723 — headers, sidebar */
--parchment: 46 100% 94%;      /* #FFF8E1 — main background */
--gold: 33 54% 51%;            /* #C6893F — CTAs, active */
--cream: 54 100% 95%;          /* #FFFDE7 — cards, chat bubbles */
--leather: 16 24% 47%;         /* #8D6E63 — borders, secondary text */
```

#### Dark Mode — "Library at Night"

```css
--night-bg: 240 26% 14%;       /* #1A1A2E — main background */
--night-surface: 218 43% 17%;  /* #16213E — cards, sidebar */
--night-gold: 40 72% 58%;      /* #E2B049 — accents, CTAs */
--night-text: 30 50% 88%;      /* #F5E6CC — primary text */
```

#### Semantic Mappings (shadcn)

| Token | Light | Dark |
|-------|-------|------|
| `--background` | parchment | night-bg |
| `--foreground` | wood-dark | night-text |
| `--primary` | gold | night-gold |
| `--primary-foreground` | cream | night-bg |
| `--secondary` | leather | night-surface |
| `--card` | cream | night-surface |
| `--card-foreground` | wood-dark | night-text |
| `--muted` | cream | night-surface |
| `--muted-foreground` | leather | night-text (at 70% opacity) |
| `--accent` | gold (at 20%) | night-gold (at 20%) |
| `--border` | leather (at 30%) | night-text (at 15%) |
| `--ring` | gold | night-gold |

---

### Standards to Consult

- `docs/standards/UI_STANDARDS.md` — Sections: Colors, Typography, Shadows, Dark Mode, Spacing
- `docs/standards/CODE_STANDARDS.md` — Sections: TypeScript Strict Rules, Naming Conventions, Import Organization
- `docs/standards/API_STANDARDS.md` — Sections: Authentication, Webhooks, Validation, Error Responses
- `docs/standards/GIT_STANDARDS.md` — Sections: Conventional Commits, Branch Strategy

---

### Decisions

1. **Combined issues 001 + 002 on one branch** — Both are Phase 0 foundations with no dependency conflicts. Reduces branch overhead. Single PR for review.
2. **Dark mode via `.dark` class, not `prefers-color-scheme`** — Manual toggle planned for issue 004 (ThemeProvider + Zustand store). For now, just define the CSS variables under `.dark`.
3. **Webhook handler logs only (no Prisma)** — Database setup is issue 003. The webhook validates and parses the event but only console.logs the action. A `// TODO: issue 003 — persist to database` comment marks the integration point.
4. **Svix for webhook verification** — Clerk recommends Svix. Verify signature before parsing body.
5. **shadcn `button` as smoke test** — Install one component to confirm the pipeline (components.json, Tailwind integration, cn() helper) works end-to-end.
6. **HSL format for CSS variables** — shadcn/ui expects `h s% l%` (without commas) for color tokens. All tokens stored in this format.
7. **Path alias `@/*` maps to project root** — Current tsconfig maps `@/*` to `./*`. shadcn components.json must match this. If shadcn expects `src/`, we adjust components.json aliases accordingly without changing tsconfig.

---

### Edge Cases

- **Missing environment variables** — Clerk middleware should fail gracefully if `CLERK_SECRET_KEY` is missing (Next.js will error at build). Webhook route must check `CLERK_WEBHOOK_SECRET` exists and return 500 if not.
- **Invalid webhook signature** — Return 401 immediately, do not parse body.
- **Unknown webhook event type** — Log and return 200 (Clerk may add new events).
- **Font loading failure** — `next/font/google` has built-in fallback. Ensure fallback font families are specified (serif for Playfair/Lora, sans-serif for Inter, monospace for JetBrains).
- **shadcn init may scaffold files** — If `npx shadcn@latest init` creates conflicting files, manually configure `components.json` instead.

---

### Required Tests

> **Note:** Vitest and Playwright are not yet installed (issue 012). For now, the Coder should write test files IF the test runner is available, otherwise defer. The webhook route should be manually testable via curl.

- [ ] Unit: `src/lib/utils/cn.test.ts` — Verifies cn() merges classes correctly, handles conditionals, resolves Tailwind conflicts
- [ ] Unit: `src/lib/validations/user.test.ts` — Verifies clerkWebhookEventSchema validates correct payloads and rejects malformed ones
- [ ] Manual: Webhook route responds 401 to unsigned requests, 200 to valid signed requests
- [ ] Manual: Sign-in and sign-up pages render Clerk components
- [ ] Manual: Protected routes redirect to sign-in when unauthenticated
- [ ] Manual: Dark mode tokens apply when `.dark` class is added to `<html>`

---

### Implementation Order

The Coder should implement sub-tasks in this exact order:

1. **T1** — Install shared deps (clsx, tailwind-merge, zod)
2. **T6** — Delete default `app/` directory
3. **T3** — Create globals.css with design tokens
4. **T2** — Create root layout.tsx with fonts and metadata
5. **T4** — Implement cn.ts utility
6. **T5** — Initialize shadcn/ui, install button component
7. **T7** — Install auth deps (@clerk/nextjs, svix)
8. **T15** — Create user.ts Zod schemas (needed by webhook)
9. **T9** — Add ClerkProvider to root layout
10. **T8** — Create Clerk middleware
11. **T10** — Create auth layout
12. **T11** — Create sign-in page
13. **T12** — Create sign-up page
14. **T14** — Add CLERK_WEBHOOK_SECRET to .env.example
15. **T13** — Implement webhook route
16. **T16** — Update document.ts validations
17. **T17** — Update chat.ts validations
18. **T18** — Update upload.ts validations

---

### Coder Prompt (copy-paste to Coder agent)

Implement issues 001-design-system-and-theming and 002-auth-and-user-sync following the Planner's plan.

## Git Workflow (FIRST)
1. `git fetch origin`
2. `git checkout feat/001-002-foundations-design-auth`
3. `git pull origin feat/001-002-foundations-design-auth`

## Files to read BEFORE coding
- `docs/plans/plan-001-002-foundations-design-auth.md` — The complete plan
- `docs/standards/UI_STANDARDS.md` — Colors, Typography, Shadows, Dark Mode
- `docs/standards/CODE_STANDARDS.md` — TypeScript, Naming, Imports
- `docs/standards/API_STANDARDS.md` — Authentication, Webhooks, Validation
- `docs/roadmap/ROADMAP.md` — Update issues 001 and 002 status from `claimed` to `in_progress`

## Scope
Design system foundation (CSS tokens, fonts, shadcn/ui, cn utility) + Clerk authentication (middleware, auth pages, webhook with Svix verification) + shared Zod validation schemas.

## Sub-tasks (implement in this order)
See "Implementation Order" section in the plan — 18 sub-tasks total.

## Commits — GRANULAR (mandatory)
- One commit per sub-task or logical group (e.g., T1+T6 can be one commit)
- Commit IMMEDIATELY after completing each sub-task
- Use selective `git add` (only files for current sub-task)
- Max ~5-8 files per commit
- NEVER do `git add .` + one giant commit

## What NOT to do
- Do NOT implement features outside the plan
- Do NOT create Prisma models or database clients (that's issue 003)
- Do NOT create ThemeProvider or theme toggle (that's issue 004)
- Do NOT create new documentation (that's Planner/Reviewer's job)
- Do NOT make architectural decisions — report if something wasn't planned

## Final verification
- Build passes: `npm run build`
- Lint passes: `npm run lint`
- Sub-tasks marked as [x] in plan-001-002-foundations-design-auth.md
