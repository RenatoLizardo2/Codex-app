## Feature: Chat API, AI Generation & Chat UI

File: docs/plans/plan-009-010-chat-and-generation.md
Issues: 009-chat-api-and-generation, 010-chat-ui-and-conversations
Date: 2026-03-16
Phase: 3
Status: Implemented

---

### Objective

Enable users to ask natural language questions about their documents and receive streaming AI responses with inline citations from original sources. Conversations are persisted, accessible from the sidebar, and can be scoped to a specific document or span all documents. Auto-summaries are generated after document indexing. This phase delivers the core value proposition — the complete "Ask the Librarian" experience.

---

### Prerequisites

- Phase 2 complete (merged): RAG pipeline (`retrieveContext`), hybrid search, Voyage reranking
- Gemini client configured (`src/lib/clients/gemini.ts` — `geminiModel` export)
- Prisma schema has `Conversation` and `Message` models with all fields
- Zod schemas exist: `createConversationSchema`, `sendMessageSchema` (`src/lib/validations/chat.ts`)
- Types exist: `ChatMessage`, `ChatCitation`, `StreamingState` (`src/types/chat.ts`), `Conversation`, `Message`, `Citation` (`src/types/database.ts`)
- Placeholder files exist for: chat components, chat pages, chat store, chat API route

---

### Sub-tasks

#### Issue 009 — Backend: Chat API & Generation

- [x] **T1** — Generation module (`src/lib/rag/generation.ts`) — Criteria: `buildSystemPrompt()` constructs a librarian persona prompt with retrieved chunks injected as numbered context, citation format instructions, and conversation history; `formatChunksForContext()` formats `RerankedChunk[]` into a numbered reference block; `extractCitations()` parses assistant response text for `[N]` bracket references and maps them back to chunks, returning `Citation[]`; exported types for generation options
- [x] **T2** — Streaming chat endpoint (`POST /api/chat/route.ts`) — Criteria: Authenticates with Clerk; validates body with a new `chatRequestSchema` (content string 1-10000 chars, conversationId optional UUID, documentId optional string); if no conversationId, creates a new conversation (auto-titles from first message, truncated to 100 chars); saves user message; calls `retrieveContext()` with userId and optional documentId; builds system prompt via `buildSystemPrompt()`; streams response with Vercel AI SDK `streamText()` using `geminiModel`; uses `onFinish` callback to save assistant message with extracted citations; returns `toDataStreamResponse()` with custom headers including `X-Conversation-Id`
- [x] **T3** — Conversation CRUD API routes — Criteria: `GET /api/conversations` lists user conversations (paginated, sorted by updatedAt desc); `GET /api/conversations/[id]` returns single conversation with last 50 messages; `PATCH /api/conversations/[id]` updates title; `DELETE /api/conversations/[id]` deletes conversation and cascade messages; all routes authenticate and scope by userId
- [x] **T4** — Auto-summary generation — Criteria: New function `generateDocumentSummary(documentId, chunks)` in `src/lib/rag/generation.ts`; called from `POST /api/embeddings` after successful indexing; selects up to 5 representative chunks (first + evenly spaced); sends to Gemini with summary prompt ("Summarize this document in 2-3 sentences"); stores result in `Document.summary` field; non-blocking — summary failure does not prevent document from becoming "ready"

#### Issue 010 — Frontend: Chat UI & Conversations

- [x] **T5** — Zustand chat store (`src/stores/chat-store.ts`) — Criteria: Implements `create()` with state: `draftInput`, `selectedDocumentId`, `isStreaming`, `activeConversationId`; actions: `setDraftInput`, `setSelectedDocumentId`, `setIsStreaming`, `setActiveConversationId`, `clearDraft`, `reset`
- [x] **T6** — TanStack Query hooks (`src/hooks/queries/use-conversations.ts`, `use-messages.ts`) — Criteria: `useConversations(page?, pageSize?)` fetches paginated conversations list; `useConversation(id)` fetches single conversation with messages; `useCreateConversation()` mutation that invalidates conversations query; `useDeleteConversation()` mutation; `useSendMessage()` custom hook that handles streaming via `fetch` with `ReadableStream`, updates local message state optimistically during streaming, then invalidates on completion
- [x] **T7** — ChatInput component (`src/components/chat/chat-input.tsx`) — Criteria: Textarea with auto-resize; reads/writes `draftInput` from chat store; Enter to submit (Shift+Enter for newline); submit button with send icon; disabled state while streaming (reads `isStreaming` from store); optional document scope selector dropdown (shows user's documents); gold accent submit button; parchment background
- [x] **T8** — StreamingText component (`src/components/chat/streaming-text.tsx`) — Criteria: Accepts `content` string prop; renders with typewriter animation using Motion (character-by-character reveal with `animate` on `opacity`); respects `prefers-reduced-motion` (instant render if reduced motion); renders markdown content (bold, italic, lists, code blocks)
- [x] **T9** — CitationCard component (`src/components/chat/citation-card.tsx`) — Criteria: Accepts `citation: ChatCitation` prop; displays as a compact inline card with book spine accent (colored left border using document color); shows citation number, quoted text snippet (truncated), document title, page number if available; links to `/document/[documentId]`; cream background, leather border; hover lift effect with Motion
- [x] **T10** — MessageBubble component (`src/components/chat/message-bubble.tsx`) — Criteria: Accepts `message: ChatMessage` and `isStreaming?: boolean` props; user messages: right-aligned, primary background, no citations; assistant messages: left-aligned, card background, renders citations below text using CitationCard; if `isStreaming`, renders content via StreamingText component; slide-up entrance animation with Motion (`initial={{ opacity: 0, y: 12 }}`); timestamp display
- [x] **T11** — ChatInterface component (`src/components/chat/chat-interface.tsx`) — Criteria: Full chat container; message list with auto-scroll to bottom on new message (using `useRef` + `scrollIntoView`); stagger animation on message list via Motion; ChatInput at bottom (sticky); empty state when no messages ("Ask the Librarian a question about your documents"); loading skeleton during initial fetch; error state with retry; receives `conversationId` prop (optional)
- [x] **T12** — ConversationList component (`src/components/chat/conversation-list.tsx`) — Criteria: New component; lists user's conversations sorted by updatedAt; each item shows title, last message preview (truncated), relative timestamp; active conversation highlighted with gold accent; "New Conversation" button at top; click navigates to `/chat/[conversationId]`; empty state: "No conversations yet"; loading skeletons; delete conversation with confirmation
- [x] **T13** — Chat pages (`/chat` and `/chat/[conversationId]`) — Criteria: `/chat/page.tsx` shows split layout: ConversationList on left (hidden on mobile), ChatInterface on right for active conversation or empty state; `/chat/[conversationId]/page.tsx` loads conversation by ID, renders ChatInterface with that conversationId; both pages are `"use client"`; handle loading/error/empty states; "New Conversation" creates conversation and navigates to it
- [x] **T14** — Document page integration — Criteria: Add "Ask about this document" button to `/document/[id]/page.tsx`; clicking creates a new conversation scoped to that documentId and navigates to `/chat/[conversationId]`; button styled with gold accent and MessageSquare icon; only shown when document status is "ready"
- [x] **T15** — Sidebar conversation section — Criteria: Add recent conversations (last 5) to sidebar below navigation items; each shows truncated title; click navigates to `/chat/[conversationId]`; "View All" link to `/chat`; uses `useConversations` hook with `pageSize: 5`

---

### Data Flow

#### Chat Message Flow (core)
```
User types message → ChatInput → useSendMessage hook
  → POST /api/chat (streaming)
    → auth() → validate → find/create conversation
    → save user message to DB
    → retrieveContext(query, userId, { documentId })
    → buildSystemPrompt(chunks, history)
    → streamText(geminiModel, { system, messages })
    → onFinish: extractCitations() → save assistant message with citations
  ← ReadableStream response
  → ChatInterface reads stream → StreamingText renders progressively
  → On stream end: invalidate messages query → full message with citations rendered
```

#### Conversation Management Flow
```
ConversationList → useConversations → GET /api/conversations → Prisma query → DB
New Conversation → POST /api/chat (no conversationId) → creates conversation → returns X-Conversation-Id header
Delete Conversation → useDeleteConversation → DELETE /api/conversations/[id] → cascade delete
```

#### Auto-Summary Flow
```
POST /api/embeddings (existing) → after successful indexing
  → generateDocumentSummary(documentId, chunks)
    → select representative chunks → Gemini prompt → save to Document.summary
  → Document status: "ready" (summary stored)
```

---

### Files to Create/Modify

#### Create
| File | Description |
|------|-------------|
| `src/lib/rag/generation.ts` | Generation module: system prompt, context formatting, citation extraction |
| `src/app/api/conversations/route.ts` | GET (list) conversations |
| `src/app/api/conversations/[id]/route.ts` | GET (single), PATCH (title), DELETE conversation |
| `src/hooks/queries/use-conversations.ts` | TanStack Query hooks for conversations + messages |
| `src/components/chat/conversation-list.tsx` | Conversation list component |

#### Modify
| File | Change |
|------|--------|
| `src/app/api/chat/route.ts` | Full implementation of streaming chat endpoint |
| `src/app/api/embeddings/route.ts` | Add auto-summary generation after indexing |
| `src/lib/validations/chat.ts` | Add `chatRequestSchema` for the chat endpoint |
| `src/types/chat.ts` | Add `ConversationWithMessages`, generation types |
| `src/stores/chat-store.ts` | Full Zustand implementation |
| `src/components/chat/chat-input.tsx` | Full implementation |
| `src/components/chat/streaming-text.tsx` | Full implementation with typewriter animation |
| `src/components/chat/citation-card.tsx` | Full implementation |
| `src/components/chat/message-bubble.tsx` | Full implementation |
| `src/components/chat/chat-interface.tsx` | Full implementation |
| `src/app/(dashboard)/chat/page.tsx` | Full chat page with conversation list |
| `src/app/(dashboard)/chat/[conversationId]/page.tsx` | Full conversation page |
| `src/app/(dashboard)/document/[id]/page.tsx` | Add "Ask about this document" button |
| `src/components/layout/sidebar.tsx` | Add recent conversations section |

---

### Technical Decisions

#### D1: Citation Format — Bracket References `[N]`
The system prompt instructs Gemini to cite sources using `[1]`, `[2]`, etc., referencing the numbered context chunks. The `extractCitations()` function parses these brackets from the response text and maps them to the original chunks. This approach is simple, reliable, and works well with LLMs that follow formatting instructions.

**Alternative considered:** Semantic matching of response segments back to chunks. Rejected — too complex, unreliable, and unnecessary when explicit references work well.

#### D2: Streaming Architecture — Vercel AI SDK `streamText()` + custom `onFinish`
Use `streamText()` from Vercel AI SDK with `geminiModel`. The `onFinish` callback persists the complete assistant message with extracted citations after streaming completes. The response is returned via `toDataStreamResponse()`.

On the frontend, `useSendMessage()` uses native `fetch` with `ReadableStream` reader to progressively read the streamed response and update the UI in real-time. We do NOT use Vercel AI SDK's `useChat()` hook — it abstracts too much and makes citation handling and conversation management harder to customize.

**Why not `useChat()`:** The Vercel AI SDK `useChat()` hook manages its own message state and doesn't easily support: (a) custom citation extraction from response, (b) conversation creation flow with redirect, (c) our Zustand store integration, (d) custom message persistence with JSONB citations. Using raw `fetch` with `ReadableStream` gives full control.

#### D3: Conversation Auto-Title
When a new conversation is created (no `conversationId` in request), the title is auto-generated from the first user message: truncate to 100 characters, append "..." if truncated. No separate LLM call for title generation — keeps it simple and fast.

#### D4: Chat Request Schema vs Send Message Schema
The existing `sendMessageSchema` requires a `conversationId`. The chat endpoint needs to also handle the case where no conversation exists yet (first message). A new `chatRequestSchema` is created: `content` (required), `conversationId` (optional), `documentId` (optional). This keeps the existing schema intact for other uses.

#### D5: Message History in Prompt
Include the last 10 messages from the conversation as context in the Gemini prompt. This provides conversational continuity without excessive token usage. Messages are formatted as `user: ...` / `assistant: ...` pairs in the messages array passed to `streamText()`.

#### D6: Auto-Summary — Non-Blocking, Best-Effort
Auto-summary generation happens after document indexing in `/api/embeddings`. If summary generation fails (e.g., Gemini rate limit), the document still transitions to "ready" status. Summary is best-effort — its absence doesn't block the user from using the document. Summary can be null.

---

### Edge Cases

1. **Empty document (no chunks):** If `retrieveContext` returns 0 chunks, the system prompt should still work but note "No relevant passages found in your documents." The assistant responds based on its general knowledge with a disclaimer.

2. **Streaming interrupted (client disconnects):** The `onFinish` callback in `streamText` still fires server-side. The partial response may be saved. This is acceptable — the message is persisted with whatever was generated.

3. **Conversation not found:** If `conversationId` is provided but doesn't exist or belongs to another user, return 404. Do not auto-create.

4. **Document deleted while conversation exists:** Conversation's `documentId` has `onDelete: SetNull` in schema. Conversations persist but become global scope. Citations still reference chunk IDs which may no longer exist — CitationCard should handle missing documents gracefully (show "Document removed" instead of link).

5. **Concurrent messages:** If user sends a second message while the first is still streaming, the frontend should prevent this (submit button disabled, `isStreaming` guard). The API doesn't need server-side concurrency control.

6. **Very long conversations (token budget):** Only the last 10 messages are included in the Gemini prompt. Older messages are still stored and displayed in the UI but not sent to the model. The `maxTokens: 2048` in ragConfig limits response length.

7. **Summary generation for very short documents:** If a document has fewer than 3 chunks, use all available chunks for summary generation. The summary prompt handles this gracefully.

8. **Rate limiting:** Not implemented in Phase 3 (deferred to Phase 4, issue 012). The API relies on Gemini's built-in rate limits. If Gemini returns a rate limit error, return 429 to the client with a user-friendly message.

---

### System Prompt Design

```
You are the Librarian of The Codex, a wise and knowledgeable assistant who helps
users understand their personal document collection. You speak with the warmth
and authority of a seasoned scholar.

## Your Role
- Answer questions based on the provided document passages
- Always cite your sources using bracket notation [1], [2], etc.
- If the passages don't contain relevant information, say so honestly
- Never fabricate information not present in the sources
- Be concise but thorough

## Source Passages
[1] (Document: "{title}", Page {pageNumber})
{chunk content}

[2] (Document: "{title}", Page {pageNumber})
{chunk content}

...

## Citation Rules
- Reference passages using [N] notation inline in your response
- You may cite multiple passages: [1][3]
- Only cite passages that directly support your statement
- If no passages are relevant, state that you couldn't find relevant information
  in the user's documents
```

---

### Required Tests

Tests are deferred to Phase 4 (issue 012) per project roadmap. However, the coder should ensure:
- [ ] `npm run build` passes with zero errors
- [ ] `npm run lint` passes with zero warnings
- [ ] Manual testing: send message → receive streaming response → citations displayed
- [ ] Manual testing: create conversation, navigate away, return → messages persisted
- [ ] Manual testing: document-scoped chat works from document page

---

### Standards to Consult

- `docs/standards/CODE_STANDARDS.md` — Section: TypeScript (no `any`, `unknown` + Zod), Named exports, Error handling
- `docs/standards/API_STANDARDS.md` — Section: Route patterns, Auth check, Streaming responses, Error format
- `docs/standards/UI_STANDARDS.md` — Section: Design tokens (library theme colors), Typography, Animations (Motion), Loading/empty/error states
- `docs/standards/GIT_STANDARDS.md` — Section: Conventional commits, Granular commits per sub-task

---

### Commit Strategy

One commit per sub-task (T1-T15), in order. Each commit should be self-contained and buildable. Suggested commit messages:

```
T1:  feat(rag): implement generation module with prompt construction and citation extraction
T2:  feat(api): implement streaming chat endpoint with Vercel AI SDK
T3:  feat(api): add conversation CRUD API routes
T4:  feat(rag): add auto-summary generation after document indexing
T5:  feat(chat): implement Zustand chat store
T6:  feat(chat): add TanStack Query hooks for conversations and messages
T7:  feat(chat): implement ChatInput component with auto-resize and document selector
T8:  feat(chat): implement StreamingText component with typewriter animation
T9:  feat(chat): implement CitationCard component with book spine styling
T10: feat(chat): implement MessageBubble component with role variants
T11: feat(chat): implement ChatInterface with message list and auto-scroll
T12: feat(chat): implement ConversationList component
T13: feat(chat): implement chat pages with split layout
T14: feat(chat): add document-scoped chat button to document page
T15: feat(chat): add recent conversations to sidebar
```
