## Feature: Advanced Animations

File: docs/plans/plan-011-advanced-animations.md
Issue: 011-advanced-animations
Date: 2026-03-18
Phase: 4
Status: Implemented

---

### Objective

Elevate the visual experience of The Codex with advanced Motion (Framer Motion) animation primitives that reinforce the classical library theme. Upgrade existing placeholder/basic components to production-quality animations: 3D book tilt with gold glow, configurable stagger, page-turning route transitions, sidebar layout animation, book-opening modal effect, dark mode desk lamp effect, parallax library header, and animated grid layout for filtering. All animations must respect `prefers-reduced-motion`.

---

### Prerequisites

- Phase 3 complete (merged): Chat UI, conversations, all core features functional
- Existing motion primitives in `src/components/motion/`: `book-tilt.tsx`, `stagger-children.tsx`, `fade-in.tsx`, `slide-in.tsx`, `page-transition.tsx` (placeholder)
- Motion (Framer Motion) v12+ installed (`motion/react` import)
- Sidebar (`src/components/layout/sidebar.tsx`) using `SlideIn` wrapper — needs upgrade to `layout` animation
- `src/app/globals.css` has duration/shadow CSS variables already defined
- `src/stores/ui-store.ts` manages sidebar open/close state
- Dashboard layout at `src/app/(dashboard)/layout.tsx` wraps children with `FadeIn`

---

### Shared Utility: Reduced Motion Hook

Before implementing any animation, create a shared hook to detect `prefers-reduced-motion`. Every animation component must use this hook to disable non-essential animation when the user has requested reduced motion.

---

### Sub-tasks

#### T1 — `useReducedMotion` hook (`src/hooks/use-reduced-motion.ts`)

Create a custom hook that reads the `prefers-reduced-motion: reduce` media query.

**Criteria:**
- Returns `boolean` — `true` when user prefers reduced motion
- Uses `window.matchMedia('(prefers-reduced-motion: reduce)')` with an event listener for live updates
- SSR-safe: defaults to `false` on the server (inside `useEffect`)
- Memoized listener cleanup on unmount

**Usage pattern in animation components:**
```tsx
const isReduced = useReducedMotion();
// If isReduced, return children unwrapped or use instant transitions (duration: 0)
```

---

#### T2 — Upgrade `BookTilt` (`src/components/motion/book-tilt.tsx`)

The existing `BookTilt` does basic scale + rotateY on hover. Upgrade to include the gold glow effect and reduced motion support.

**Current state:** Scale 1.03, rotateY 3deg, warm box-shadow on hover. No glow. No reduced motion.

**Changes:**
- Add a gold glow layer: an absolutely-positioned inner `<div>` with `background: radial-gradient(ellipse, hsl(var(--gold)) / 0.15, transparent 70%)` that fades in on hover via `motion.div` `animate` tied to a `isHovered` state
- Use `onHoverStart` / `onHoverEnd` from Motion to track hover state
- Add `whileTap={{ scale: 0.97 }}` for press feedback
- Integrate `useReducedMotion`: if reduced, skip all transforms, only apply a subtle border-color change on hover
- Keep existing props: `children`, `className`, `tiltDegree`
- Add optional `glowColor?: string` prop (defaults to gold token)

**Files:** `src/components/motion/book-tilt.tsx`

---

#### T3 — Upgrade `StaggerChildren` (`src/components/motion/stagger-children.tsx`)

Existing implementation is functional but lacks reduced motion support and `whileInView` triggering.

**Changes:**
- Add `useReducedMotion` integration: if reduced, render all children immediately (opacity 1, y 0, no stagger delay)
- Add `triggerOnView?: boolean` prop (default `true`) — when true, use `whileInView` instead of `animate` so the stagger only fires when the element scrolls into view (with `viewport={{ once: true, amount: 0.2 }}`)
- Add `direction?: "up" | "down" | "left" | "right"` prop to control the translate direction of children items (default `"up"`)
- Ensure `StaggerItem` also respects reduced motion via context or direct prop

**Files:** `src/components/motion/stagger-children.tsx`

---

#### T4 — Implement `PageTransition` (`src/components/motion/page-transition.tsx`)

The current `page-transition.tsx` is a placeholder (bare `<div>`). Implement a real page-turning transition using `AnimatePresence`.

**Design:**
- Wrap children in `motion.div` with `AnimatePresence mode="wait"`
- Use a `key` derived from the current pathname (via `usePathname()`)
- Enter animation: `initial={{ opacity: 0, y: 8 }}` → `animate={{ opacity: 1, y: 0 }}`
- Exit animation: `exit={{ opacity: 0, y: -8 }}`
- Duration: 300ms, ease: `[0.16, 1, 0.3, 1]`
- Reduced motion: `duration: 0` for all transitions
- Must be a `"use client"` component

**Integration point:** Replace the `<FadeIn>` wrapper in `src/app/(dashboard)/layout.tsx` with `<PageTransition>`. The `key` must change on route change to trigger exit/enter animations.

**Files:** `src/components/motion/page-transition.tsx`, `src/app/(dashboard)/layout.tsx`

---

#### T5 — Sidebar layout animation (`src/components/layout/sidebar.tsx`)

Currently the sidebar shows/hides with a binary `if (!sidebarOpen) return null` gated by a `SlideIn` wrapper. Upgrade to a smooth layout animation with expand/collapse.

**Design:**
- Remove the `SlideIn` wrapper
- Use `motion.aside` with `layout` prop for smooth width transitions
- Animate width between `0px` (collapsed) and `256px` (expanded) using `animate={{ width: sidebarOpen ? 256 : 0 }}`
- Use `overflow: hidden` on the aside so content clips during collapse
- Inner content fades out/in with `AnimatePresence` and `motion.div` exit/enter animations for the nav items and branding
- Transition: `type: "spring", stiffness: 300, damping: 30` for a snappy feel
- Reduced motion: instant width change (duration 0)
- Desktop only — mobile sidebar is handled by `MobileNav` (keep as-is, but add AnimatePresence for the backdrop + slide-in for the panel)

**Mobile nav upgrade** (`src/components/layout/mobile-nav.tsx`):
- Wrap the entire component in `AnimatePresence`
- Animate backdrop opacity from 0 → 1
- Slide the aside panel in from the left with `motion.aside` (`initial={{ x: -256 }}` → `animate={{ x: 0 }}`)
- Exit: reverse animations

**Files:** `src/components/layout/sidebar.tsx`, `src/components/layout/mobile-nav.tsx`

---

#### T6 — Modal book-opening animation

Create a reusable `AnimatedModal` wrapper that applies a book-opening effect (scaleY from 0 to 1, like a book cover opening) when a modal opens.

**Design:**
- New file: `src/components/motion/animated-modal.tsx`
- Props: `isOpen: boolean`, `onClose: () => void`, `children: React.ReactNode`, `className?: string`
- Uses `AnimatePresence` to handle mount/unmount
- Backdrop: `motion.div` with fade in/out (`opacity: 0 → 0.5`)
- Content panel: `motion.div` with `initial={{ scaleY: 0, opacity: 0 }}` → `animate={{ scaleY: 1, opacity: 1 }}` with `transformOrigin: "top"` to simulate a book opening from the top
- Exit: reverse the scaleY animation
- Transition: 400ms, ease `[0.16, 1, 0.3, 1]`
- Reduced motion: instant open/close (duration 0)
- Trap focus inside modal (use native `<dialog>` element or `role="dialog"` + `aria-modal="true"`)
- Close on Escape key and backdrop click

**Integration point:** Use `AnimatedModal` for the upload modal (if one is created) and any future modals. For now, export and document usage pattern — integration can happen when modals are used in the app.

**Files:** `src/components/motion/animated-modal.tsx`

---

#### T7 — Desk lamp radial gradient effect (dark mode chat)

In dark mode, the chat area should have a subtle desk lamp effect — a warm radial gradient emanating from the top-center, as if an old desk lamp illuminates the reading area.

**Design:**
- New file: `src/components/motion/desk-lamp.tsx`
- A `"use client"` component that renders an absolutely-positioned gradient layer
- Only visible in dark mode (use `dark:` Tailwind prefix or check theme via `next-themes`)
- CSS: `background: radial-gradient(ellipse 60% 40% at 50% 0%, hsl(var(--night-gold) / 0.08), transparent)`
- The gradient should be a fixed decorative layer at the top of the chat area, `pointer-events-none`, `z-0`
- Subtle fade-in animation on mount (300ms)
- Reduced motion: render statically without fade animation

**Integration point:** Add `<DeskLamp />` inside the chat interface message list area (`src/components/chat/chat-interface.tsx`) as a background decorative element, positioned behind messages.

**Files:** `src/components/motion/desk-lamp.tsx`, `src/components/chat/chat-interface.tsx`

---

#### T8 — Parallax library header

Add a subtle parallax scroll effect to the "My Library" header section on the library page.

**Design:**
- New file: `src/components/motion/parallax.tsx`
- A reusable `Parallax` wrapper component that uses Motion's `useScroll` + `useTransform` hooks
- Props: `children`, `speed?: number` (default `0.3` — how much slower the element scrolls relative to page), `className?: string`
- Uses `useScroll({ target, offset })` to track the scroll position of the nearest scrollable parent
- Applies `translateY` transform proportional to scroll position: `useTransform(scrollYProgress, [0, 1], ['0%', `${speed * 100}%`])`
- Reduced motion: no transform applied

**Integration point:** Wrap the header section (the `<div>` containing "My Library" h1 and tome count) in `<Parallax>` on the library page (`src/app/(dashboard)/library/page.tsx`).

Note: The scrollable container is the `<main>` in the dashboard layout. The `useScroll` hook needs to target this container, not the window. Pass a `ref` or use `useScroll()` from window level.

**Files:** `src/components/motion/parallax.tsx`, `src/app/(dashboard)/library/page.tsx`

---

#### T9 — Grid layout animation for BookShelf

When documents are filtered or searched, the grid should smoothly reorganize using Motion's `layoutId` and `layout` animations.

**Design:**
- Modify `BookShelf` (`src/components/library/book-shelf.tsx`) to use `motion.div` with `layout` prop on the grid container
- Each `StaggerItem` wrapping a `BookCard` should receive a `layoutId={doc.id}` so Motion can animate position changes when items are added/removed/reordered
- Use `LayoutGroup` from `motion/react` to scope the layout animations
- Enter animation for new items: fade + scale from 0.9
- Exit animation for removed items: fade + scale to 0.9 (requires `AnimatePresence`)
- Transition: spring with `stiffness: 300, damping: 30`
- Reduced motion: items appear/disappear instantly

**Files:** `src/components/library/book-shelf.tsx`, `src/components/motion/stagger-children.tsx` (if `StaggerItem` needs `layoutId` support)

---

#### T10 — Integration pass and verification

Final verification that all animations work together correctly.

**Criteria:**
- All animation components import and use `useReducedMotion`
- Test with `prefers-reduced-motion: reduce` in browser DevTools — all non-essential animations should be disabled
- No layout shift (CLS) caused by animations
- No hydration mismatches from SSR (all animation state initializes identically on server and client)
- Dashboard layout uses `PageTransition` instead of `FadeIn`
- Sidebar smoothly expands/collapses on desktop toggle
- Mobile nav slides in/out with backdrop animation
- BookTilt shows gold glow on hover
- Chat area shows desk lamp gradient in dark mode
- Library header has subtle parallax on scroll
- BookShelf grid animates when list changes
- `npm run build` passes with zero errors
- `npm run lint` passes with zero warnings

**Files:** All modified files from T1-T9

---

### Files Created (new)

| File | Purpose |
|------|---------|
| `src/hooks/use-reduced-motion.ts` | Shared hook for `prefers-reduced-motion` detection |
| `src/components/motion/animated-modal.tsx` | Book-opening modal animation wrapper |
| `src/components/motion/desk-lamp.tsx` | Dark mode desk lamp radial gradient effect |
| `src/components/motion/parallax.tsx` | Reusable parallax scroll wrapper |

### Files Modified

| File | Changes |
|------|---------|
| `src/components/motion/book-tilt.tsx` | Add gold glow, reduced motion, whileTap |
| `src/components/motion/stagger-children.tsx` | Add reduced motion, whileInView, direction |
| `src/components/motion/page-transition.tsx` | Full implementation replacing placeholder |
| `src/components/layout/sidebar.tsx` | Layout animation for expand/collapse |
| `src/components/layout/mobile-nav.tsx` | AnimatePresence + slide/fade animations |
| `src/components/chat/chat-interface.tsx` | Add DeskLamp component |
| `src/components/library/book-shelf.tsx` | Layout animation with LayoutGroup |
| `src/app/(dashboard)/layout.tsx` | Replace FadeIn with PageTransition |
| `src/app/(dashboard)/library/page.tsx` | Add Parallax to header |

---

### Implementation Order

```
T1 (useReducedMotion) — foundation, all others depend on it
  ├── T2 (BookTilt upgrade) — standalone
  ├── T3 (StaggerChildren upgrade) — standalone
  ├── T4 (PageTransition) — standalone, then integrate into layout
  ├── T5 (Sidebar layout animation) — standalone
  ├── T6 (AnimatedModal) — standalone new file
  ├── T7 (DeskLamp) — standalone, then integrate into chat
  ├── T8 (Parallax) — standalone, then integrate into library
  └── T9 (Grid layout animation) — depends on T3
T10 (Integration verification) — after all others complete
```

T2 through T9 are independent of each other (except T9 depends on T3 being done first). They can be implemented in any order after T1.

---

### Accessibility Considerations

- **`prefers-reduced-motion`:** Every animation component checks this and disables transforms/transitions. This is the most critical accessibility requirement.
- **Focus management:** `AnimatedModal` must trap focus and restore focus on close.
- **No seizure risk:** No flashing animations, no rapid strobing. All animations are smooth, low-frequency transitions.
- **Keyboard navigation:** All animated interactive elements (BookTilt cards, sidebar toggle, modal) remain fully keyboard-accessible.
- **Screen readers:** Animations are decorative and do not convey information. No `aria-live` regions needed for animation state.

---

### Performance Considerations

- All animations use `transform` and `opacity` only — these are GPU-composited and do not trigger layout reflow
- `will-change: transform` applied sparingly (only on `BookTilt` which has 3D transforms)
- `LayoutGroup` scoped to BookShelf grid to limit layout calculation scope
- `whileInView` with `viewport={{ once: true }}` prevents re-triggering stagger animations on scroll
- `AnimatePresence` exit animations are short (300ms max) to avoid perceived sluggishness
- No requestAnimationFrame loops or continuous scroll listeners — Motion handles these internally via its optimized scheduler
