# Phase 7 — AI Money Assistant (Design)

**Status:** Approved for planning · 2026-06-13
**Scope:** A dedicated chat page where the user asks about their finances in plain language and gets accurate, data-grounded answers — powered by an LLM with **read-only tool-calling** over the existing data services. Builds on 6a/6b (auth, per-user isolation).

## Goal

Turn the data FuFi already collects into plain-language insight. The user asks ("How much did I spend on food last month?", "Can I afford a ₹40k trip?", "Where can I cut back?") and the assistant answers from *their* data via tools. Read-only — it never changes data. Conversations are saved per user and resumable.

## Decisions (from brainstorming)

- **Capability:** read-only Q&A + insights. No mutations through chat (logging transactions / setting budgets is a later phase).
- **Interface:** a dedicated **Assistant** page (`/assistant`) in the nav (sidebar + bottom bar).
- **History:** conversations **saved per user** in the DB; resumable, browsable.
- **Provider:** **Groq free tier** (`llama-3.3-70b-versatile`) — free, fast, supports tool-calling, and does **not** train on API data (best privacy for financial data). Built **provider-agnostic** so it swaps to Gemini/OpenRouter/Anthropic via env.
- **Architecture:** Vercel **AI SDK** (`ai` + `@ai-sdk/openai` + `@ai-sdk/react`) for streaming + the tool-call agent loop; `createOpenAI({ baseURL, apiKey })` aimed at Groq's OpenAI-compatible endpoint.

## Architecture & data flow

```
Assistant page (useChat) ──POST /api/assistant {conversationId, messages}──▶ Route Handler
  Route: getSession() → userId (401 if none)
         streamText({ model, system, messages, tools, maxSteps })
            └─ model requests a tool → execute server-side, SCOPED to userId (read-only) → return result
            └─ loops up to maxSteps, then streams the final answer
         onFinish → persist the user + assistant turns; set title on first turn
  ◀── streamed tokens ── client renders progressively
```

- **Model:** `createOpenAI({ baseURL: process.env.AI_BASE_URL ?? "https://api.groq.com/openai/v1", apiKey: process.env.AI_API_KEY })(process.env.AI_MODEL ?? "llama-3.3-70b-versatile")`.
- **Isolation rule (critical):** every tool resolves the current user via `getSession()` server-side. Tools NEVER accept a `userId` argument from the model. No tool can write.
- **Graceful fallback:** if `AI_API_KEY` is unset, the page renders a "Connect an AI key to enable the assistant" state; the rest of the app is unaffected.
- **AI SDK version caveat:** the Vercel AI SDK's API changed across majors (e.g. `maxSteps` → `stopWhen: stepCountIs(n)`, `toDataStreamResponse` → `toUIMessageStreamResponse`, and the `useChat` message shape `content` → `parts`). The plan's first task **installs the SDK and confirms the exact API surface** against the installed version before writing the route/UI — same approach used for `arctic` in 6b.

## Tools (read-only, session-scoped) — map to existing `src/services/*`

Each is an AI SDK `tool({ description, parameters: z.object({...}), execute })`; `execute` calls `getSession()` then the service. Responses are kept **small** (summaries + capped lists) to control tokens.

- `get_today()` → today's date + current month (so "last month" resolves).
- `get_spending_summary({ month })` → income, expense, by-category breakdown (`analytics`/`transactions`).
- `get_transactions({ month?, category?, type?, limit? })` → capped list (≤ 50) of transactions.
- `get_budget_status({ month })` → budget vs actual per category (`budget`).
- `get_savings()` → savings total + goals/progress (`savings`).
- `get_loans()` → loans/EMIs, outstanding, next due (`loan`).
- `get_salary_allocation()` → salary + allocation plan (`salary`).
- `get_running_balance({ month? })` → opening/closing/running balance (`balance`).

(The plan confirms exact service signatures; tools adapt to them and never expand beyond read access.)

## Data model (Mongoose, hot-reload guarded, per-user)

- `Conversation { userId: ObjectId, title: string, createdAt, updatedAt }`
- `Message { conversationId: ObjectId, userId: ObjectId, role: "user" | "assistant", content: string, createdAt }`

Persist only user/assistant **text turns** (not raw tool JSON). On resume, prior turns are replayed as context; the model re-runs tools for new questions. `title` is derived from the first user message (truncated). All queries filtered by `userId`.

## UI — `/assistant` page (in the `(app)` group → AppShell)

- **Nav:** add an "Assistant" entry (e.g. `Sparkles`/`Bot` icon) to `src/lib/nav.ts` so it shows in the sidebar and bottom bar.
- **Layout:** a conversation list (past chats + "New chat") alongside the active thread; composer at the bottom; **suggested prompts** when a chat is empty ("How much did I spend last month?", "Can I afford a ₹40k trip?", "Where can I cut back?", "Summarise my month"). On mobile the conversation list is a drawer/sheet.
- **Rendering:** assistant messages render as text with `whitespace-pre-wrap`; the system prompt instructs concise, lightly-formatted answers (simple dashes for lists) so no markdown library is needed in v1.
- **States:** streaming indicator ("Looking at your data…" during tool rounds), empty state with suggestions, and the unconfigured state (no key).
- **Disclaimer:** a subtle one-liner — "Insights, not professional financial advice."
- Uses `@ai-sdk/react` `useChat({ api: "/api/assistant", body: { conversationId }, initialMessages })`. React Compiler is on — no manual memoization.

## System prompt

Persona = FuFi's money assistant. Currency **₹ / INR**. Today's date injected. Answer **only** from tool data; if data is missing, say so. Concise, friendly, plain text. Decline out-of-scope or advice-heavy asks with the disclaimer. Never invent numbers.

## Safety & privacy

- Read-only, session-scoped tools; route requires an authenticated session (401 otherwise). No cross-user access; no mutations.
- The user's financial data is sent to the configured AI provider to answer questions — stated in the UI. Default provider (Groq) does not train on API data.
- `AI_API_KEY` only on the server (never shipped to the client). Conversations stored per user; deletable (a "delete conversation" affordance).

## Config / env (user-provided in `.env.local`)

- `AI_API_KEY` — free Groq key from console.groq.com (required to enable the assistant).
- `AI_BASE_URL` — default `https://api.groq.com/openai/v1` (swap provider).
- `AI_MODEL` — default `llama-3.3-70b-versatile` (swap model).

## Files

**New**
- `src/app/(app)/assistant/page.tsx` — server page: loads the user's conversations; renders the client view.
- `src/components/assistant/assistant-view.tsx` — client chat UI (`useChat`, list, composer, suggestions).
- `src/app/api/assistant/route.ts` — streaming tool-calling route.
- `src/lib/ai/model.ts` — provider/model factory + `isAiConfigured()`.
- `src/lib/ai/tools.ts` — read-only, session-scoped tool definitions.
- `src/lib/ai/system-prompt.ts` — system prompt builder (injects today's date).
- `src/models/Conversation.ts`, `src/models/Message.ts`.
- `src/services/assistant.ts` — conversation/message persistence + list/load/delete (per-user).

**Modified**
- `src/lib/nav.ts` — add the Assistant nav entry.
- `package.json` — `ai`, `@ai-sdk/openai`, `@ai-sdk/react`.
- `.env.local` (user-managed) — `AI_API_KEY` (+ optional `AI_BASE_URL`, `AI_MODEL`).

## Testing

- **Vitest:** pure logic — title derivation from first message, tool parameter schemas/argument normalisation, the unconfigured-key guard. (The LLM call itself is integration-tested manually.)
- **Build:** `npx tsc --noEmit`, `npx eslint .`, `npx next build` clean; `/assistant` + `/api/assistant` present.
- **Manual:** with a Groq key set — ask "how much did I spend last month?", "can I afford ₹40k?", "where can I cut back?"; confirm answers match the data; start a new chat, reload, resume a saved chat; with the key unset, the page shows the connect-key state and the app still works.

## Out of scope (YAGNI)

Taking actions via chat (logging transactions, setting budgets), voice input, multi-language, web search, proactive/push insights, per-day rate caps, and a markdown renderer (plain formatting in v1).
