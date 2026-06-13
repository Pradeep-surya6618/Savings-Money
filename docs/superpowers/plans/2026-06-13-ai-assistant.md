# AI Money Assistant Implementation Plan (Phase 7)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A dedicated `/assistant` chat page where the user asks about their finances in plain language and gets accurate, data-grounded answers — an LLM with read-only tool-calling over the existing data services, with saved per-user conversations.

**Architecture:** Vercel AI SDK `streamText` runs a tool-calling loop in a Route Handler; tools are thin read-only wrappers over `src/services/*` (which already resolve the current user internally). Answers stream to a `useChat` page. Conversations persist in Mongo. Provider is configurable (defaults to free Groq) via env.

**Tech Stack:** Next.js 16 (Route Handlers, App Router), Vercel AI SDK (`ai`, `@ai-sdk/openai-compatible`, `@ai-sdk/react`), Groq (OpenAI-compatible) by default, Mongoose, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-13-ai-assistant-design.md`

**Branch:** Work on an `ai-assistant` feature branch (not `main`).

**Verification (Windows harness):** Use ONLY `npx tsc --noEmit`, `npx eslint <paths>`, `npx vitest run <path>`, `npx next build`. NOT `npm run lint`/`npm run test`.

**Env (user-provided in `.env.local`):** `AI_API_KEY` (free key from console.groq.com), optional `AI_BASE_URL` (default `https://api.groq.com/openai/v1`), optional `AI_MODEL` (default `llama-3.3-70b-versatile`). Read directly from `process.env` — do NOT add to `src/lib/env.ts` (the assistant is optional; the app must run without a key).

**Standing constraints:** React Compiler ON — no `useMemo`/`useCallback`/`memo`. No `any`. Mongoose models use the hot-reload guard (`models.X || model(...)`). Commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Never `git add -A`/`.` — stage only each task's files.

> **Spec refinement:** use **`@ai-sdk/openai-compatible`** (`createOpenAICompatible`) rather than `@ai-sdk/openai` — it's the provider-agnostic client for OpenAI-compatible endpoints (Groq/OpenRouter/Together/local), avoiding OpenAI-only params.

---

## File Structure

**New**
- `src/models/Conversation.ts`, `src/models/Message.ts` — persistence.
- `src/services/assistant.ts` — conversation/message CRUD (per-user) + `deriveTitle`.
- `src/lib/ai/model.ts` — provider/model factory + `isAiConfigured()`.
- `src/lib/ai/system-prompt.ts` — system prompt builder.
- `src/lib/ai/tools.ts` — read-only tool definitions.
- `src/app/api/assistant/route.ts` — streaming tool-calling route.
- `src/app/(app)/assistant/page.tsx` — server page.
- `src/components/assistant/assistant-view.tsx` — client chat UI.

**Modified**
- `src/lib/nav.ts` — add the Assistant nav entry.
- `package.json` — AI SDK deps.

---

## Task 1: Install the AI SDK + confirm the API surface

**Files:** `package.json`.

- [ ] **Step 1: Install**

Run:
```bash
npm install ai @ai-sdk/openai-compatible @ai-sdk/react zod
```
(`zod` is already present — harmless to ensure.)

- [ ] **Step 2: Inspect the installed API** (the AI SDK changes across majors — confirm before writing code). Read the installed type defs / package versions and record answers to:
  1. `streamText` — how to bound the tool loop: `maxSteps: n` (v4) **or** `stopWhen: stepCountIs(n)` (v5)?
  2. How to return the stream from a Route Handler: `result.toDataStreamResponse()` (v4) **or** `result.toUIMessageStreamResponse()` (v5)?
  3. `tool({ description, parameters, execute })` — is the schema key `parameters` (v4) or `inputSchema` (v5)?
  4. `@ai-sdk/react` `useChat` — does it take `{ api, body }` directly (v4) or require a `transport: new DefaultChatTransport({ api, body })` (v5)? Is the message text on `message.content` (v4) or `message.parts[]` (v5)?
  5. `createOpenAICompatible` import + signature (`{ name, baseURL, apiKey }`).

Write the answers as a short comment block at the top of `src/lib/ai/model.ts` when you create it (Task 4), and implement Tasks 6–7 to MATCH the installed version. Where this plan shows v4-style code, translate to v5 if that's what's installed.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(ai): add Vercel AI SDK (ai, openai-compatible, react)"
```

---

## Task 2: Conversation + Message models

**Files:** Create `src/models/Conversation.ts`, `src/models/Message.ts`. (Match the existing model style — check `src/models/Session.ts` for the hot-reload-guard pattern.)

- [ ] **Step 1: Conversation model**

```ts
import { Schema, model, models, type InferSchemaType } from "mongoose";

const conversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, default: "New chat" },
  },
  { timestamps: true },
);

export type ConversationDoc = InferSchemaType<typeof conversationSchema> & { _id: Schema.Types.ObjectId };
export const Conversation = models.Conversation || model("Conversation", conversationSchema);
```

- [ ] **Step 2: Message model**

```ts
import { Schema, model, models, type InferSchemaType } from "mongoose";

const messageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true },
);

export type MessageDoc = InferSchemaType<typeof messageSchema> & { _id: Schema.Types.ObjectId };
export const Message = models.Message || model("Message", messageSchema);
```

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit` then `npx eslint src/models/Conversation.ts src/models/Message.ts`. Expected: clean.
```bash
git add src/models/Conversation.ts src/models/Message.ts
git commit -m "feat(assistant): Conversation + Message models"
```

---

## Task 3: Persistence service (per-user) + title helper (TDD for the helper)

**Files:** Create `src/services/assistant.ts`, `src/services/assistant.test.ts`. Uses `getSession` from `src/lib/auth/session.ts` and `connectDB` from `src/lib/mongodb/connect.ts`.

- [ ] **Step 1: Write the failing test for `deriveTitle`**

```ts
import { describe, it, expect } from "vitest";
import { deriveTitle } from "@/services/assistant";

describe("deriveTitle", () => {
  it("uses the trimmed first message", () => {
    expect(deriveTitle("How much did I spend on food?")).toBe("How much did I spend on food?");
  });
  it("truncates long messages with an ellipsis", () => {
    const long = "a".repeat(80);
    const t = deriveTitle(long);
    expect(t.length).toBeLessThanOrEqual(48);
    expect(t.endsWith("…")).toBe(true);
  });
  it("falls back to 'New chat' for empty input", () => {
    expect(deriveTitle("   ")).toBe("New chat");
  });
});
```

- [ ] **Step 2: Run it — expect FAIL.** `npx vitest run src/services/assistant.test.ts`

- [ ] **Step 3: Implement the service**

```ts
"use server";

import { connectDB } from "@/lib/mongodb/connect";
import { getSession } from "@/lib/auth/session";
import { Conversation } from "@/models/Conversation";
import { Message } from "@/models/Message";

export type ChatTurn = { id: string; role: "user" | "assistant"; content: string };
export type ConversationSummary = { id: string; title: string; updatedAt: string };

export function deriveTitle(firstMessage: string): string {
  const t = firstMessage.trim();
  if (!t) return "New chat";
  return t.length > 48 ? `${t.slice(0, 47)}…` : t;
}

async function requireUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.userId ?? null;
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const userId = await requireUserId();
  if (!userId) return [];
  await connectDB();
  const rows = await Conversation.find({ userId }).sort({ updatedAt: -1 }).limit(50).lean();
  return rows.map((c) => ({ id: String(c._id), title: c.title, updatedAt: (c.updatedAt as Date).toISOString() }));
}

export async function getConversationMessages(conversationId: string): Promise<ChatTurn[]> {
  const userId = await requireUserId();
  if (!userId) return [];
  await connectDB();
  const convo = await Conversation.findOne({ _id: conversationId, userId }).lean();
  if (!convo) return [];
  const rows = await Message.find({ conversationId, userId }).sort({ createdAt: 1 }).lean();
  return rows.map((m) => ({ id: String(m._id), role: m.role as "user" | "assistant", content: m.content }));
}

/** Append a turn; create the conversation (titled from the text) if conversationId is absent
 *  or not owned by the user. Returns the conversation id used. */
export async function appendTurn(
  conversationId: string | null,
  role: "user" | "assistant",
  content: string,
): Promise<string> {
  const userId = await requireUserId();
  if (!userId) throw new Error("unauthorized");
  await connectDB();
  let convo = conversationId ? await Conversation.findOne({ _id: conversationId, userId }) : null;
  if (!convo) {
    convo = await Conversation.create({ userId, title: deriveTitle(content) });
  }
  await Message.create({ conversationId: convo._id, userId, role, content });
  await Conversation.updateOne({ _id: convo._id }, { $set: { updatedAt: new Date() } });
  return String(convo._id);
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const userId = await requireUserId();
  if (!userId) return;
  await connectDB();
  const convo = await Conversation.findOne({ _id: conversationId, userId });
  if (!convo) return;
  await Message.deleteMany({ conversationId: convo._id, userId });
  await Conversation.deleteOne({ _id: convo._id });
}
```

- [ ] **Step 4: Run the test — expect PASS** (3 tests). `npx vitest run src/services/assistant.test.ts`
- [ ] **Step 5: Verify + commit**

Run: `npx tsc --noEmit` then `npx eslint src/services/assistant.ts src/services/assistant.test.ts`.
```bash
git add src/services/assistant.ts src/services/assistant.test.ts
git commit -m "feat(assistant): per-user conversation/message persistence + title helper"
```

---

## Task 4: Model factory + system prompt

**Files:** Create `src/lib/ai/model.ts`, `src/lib/ai/system-prompt.ts`.

- [ ] **Step 1: `model.ts`** (put the Task-1 API notes as a comment at the top)

```ts
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const BASE_URL = process.env.AI_BASE_URL ?? "https://api.groq.com/openai/v1";
const MODEL = process.env.AI_MODEL ?? "llama-3.3-70b-versatile";

export function isAiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY);
}

export function getModel() {
  const provider = createOpenAICompatible({
    name: "fufi-ai",
    baseURL: BASE_URL,
    apiKey: process.env.AI_API_KEY ?? "",
  });
  return provider(MODEL);
}
```

- [ ] **Step 2: `system-prompt.ts`**

```ts
export function buildSystemPrompt(todayISO: string): string {
  return [
    "You are FuFi's money assistant — a friendly, concise personal-finance helper.",
    `Today is ${todayISO}. All amounts are in Indian Rupees (₹).`,
    "Answer ONLY from the user's own data, which you read via the provided tools. Call tools to get real numbers — never invent or estimate figures.",
    "If the data needed isn't available from a tool, say so plainly.",
    "Keep answers short and clear. Use simple dashes for lists. Do not use markdown tables or headings.",
    "You can explain and summarise, but you do not give professional financial, tax, or investment advice — gently note that when asked for it.",
    "You cannot change any data; you are read-only.",
  ].join("\n");
}
```

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit` then `npx eslint src/lib/ai/model.ts src/lib/ai/system-prompt.ts`.
```bash
git add src/lib/ai/model.ts src/lib/ai/system-prompt.ts
git commit -m "feat(assistant): provider-agnostic model factory + system prompt"
```

---

## Task 5: Read-only tools over the data services

**Files:** Create `src/lib/ai/tools.ts`. Wrap existing services (all resolve the current user internally — the route already requires a session, so these are inherently scoped + read-only). Use the schema key (`parameters` vs `inputSchema`) confirmed in Task 1.

- [ ] **Step 1: Confirm service return shapes.** Open `src/services/{analytics,transactions,budget,savings,loan,salary,balance}.ts` and note each DTO. The tools return those DTOs (trim transaction lists to ≤ 50 items to bound tokens). Month strings are `"YYYY-MM"` (see `src/lib/month.ts`).

- [ ] **Step 2: Implement the tools** (v4-style `parameters` shown — switch to `inputSchema` if Task 1 found v5):

```ts
import { tool } from "ai";
import { z } from "zod";
import { getAnalytics } from "@/services/analytics";
import { listTransactions } from "@/services/transactions";
import { getBudget } from "@/services/budget";
import { getSavings } from "@/services/savings";
import { getLoan } from "@/services/loan";
import { getMonthSummary } from "@/services/salary";
import { getBalance } from "@/services/balance";
import { currentMonth } from "@/lib/month"; // confirm the exact export name in src/lib/month.ts

const monthArg = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).describe("Month as YYYY-MM").optional() });

export const assistantTools = {
  get_today: tool({
    description: "Current date and current month (YYYY-MM). Use to resolve relative dates like 'last month'.",
    parameters: z.object({}),
    execute: async () => ({ today: new Date().toISOString().slice(0, 10), currentMonth: currentMonth() }),
  }),
  get_spending_summary: tool({
    description: "Income, expense totals and category breakdown for a month.",
    parameters: monthArg,
    execute: async ({ month }) => getAnalytics(month ?? currentMonth()),
  }),
  get_transactions: tool({
    description: "Recent transactions (most recent first, capped at 50).",
    parameters: z.object({
      category: z.string().optional(),
      type: z.enum(["income", "expense"]).optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }),
    execute: async ({ category, type, limit }) => {
      let txns = await listTransactions();
      if (category) txns = txns.filter((t) => t.category === category);
      if (type) txns = txns.filter((t) => t.type === type);
      return txns.slice(0, limit ?? 50);
    },
  }),
  get_budget_status: tool({
    description: "Budget vs actual per category for a month.",
    parameters: monthArg,
    execute: async ({ month }) => getBudget(month ?? currentMonth()),
  }),
  get_savings: tool({
    description: "Savings total and goals/progress.",
    parameters: z.object({}),
    execute: async () => getSavings(),
  }),
  get_loans: tool({
    description: "Loans/EMIs: outstanding amounts and schedule.",
    parameters: z.object({}),
    execute: async () => getLoan(),
  }),
  get_salary_allocation: tool({
    description: "Salary and how it is allocated for a month.",
    parameters: monthArg,
    execute: async ({ month }) => getMonthSummary(month ?? currentMonth()),
  }),
  get_running_balance: tool({
    description: "Opening/closing and running cash balance.",
    parameters: z.object({}),
    execute: async () => getBalance(),
  }),
};
```
> Adapt field names (`t.category`, `t.type`) to the actual `TransactionDTO`; adapt `currentMonth()` to the real helper in `src/lib/month.ts`. Do NOT add any tool that writes.

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit` then `npx eslint src/lib/ai/tools.ts`.
```bash
git add src/lib/ai/tools.ts
git commit -m "feat(assistant): read-only tools over data services"
```

---

## Task 6: Streaming route handler

**Files:** Create `src/app/api/assistant/route.ts`. Use the step-control + response-helper confirmed in Task 1.

- [ ] **Step 1: Implement** (v4-style shown — translate to v5 per Task 1):

```ts
import { streamText } from "ai";
import { getSession } from "@/lib/auth/session";
import { getModel, isAiConfigured } from "@/lib/ai/model";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { assistantTools } from "@/lib/ai/tools";
import { appendTurn } from "@/services/assistant";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (!isAiConfigured()) return new Response("AI not configured", { status: 503 });

  const { messages, conversationId } = (await req.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
    conversationId: string | null;
  };

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  let convId = conversationId;
  if (lastUser) convId = await appendTurn(conversationId, "user", lastUser.content);

  const result = streamText({
    model: getModel(),
    system: buildSystemPrompt(new Date().toISOString().slice(0, 10)),
    messages,
    tools: assistantTools,
    maxSteps: 6, // v5: stopWhen: stepCountIs(6)
    onFinish: async ({ text }) => {
      if (text.trim()) await appendTurn(convId, "assistant", text);
    },
  });

  // v4: toDataStreamResponse with a custom header to return the conversation id.
  // v5: toUIMessageStreamResponse. Either way, expose the conversation id (header below).
  const res = result.toDataStreamResponse();
  if (convId) res.headers.set("x-conversation-id", convId);
  return res;
}
```
> Send the chosen `conversationId` back so the client can adopt a freshly-created conversation. If header passing is awkward with the installed version, instead create the conversation in a separate lightweight action before streaming and pass the id in the request body.

- [ ] **Step 2: Verify + commit**

Run: `npx tsc --noEmit` then `npx eslint "src/app/api/assistant/route.ts"`.
```bash
git add "src/app/api/assistant/route.ts"
git commit -m "feat(assistant): streaming tool-calling route"
```

---

## Task 7: Assistant page + chat UI

**Files:** Create `src/app/(app)/assistant/page.tsx`, `src/components/assistant/assistant-view.tsx`.

- [ ] **Step 1: Server page** — fetch conversations + configured flag, pass to the client view:

```tsx
import { listConversations } from "@/services/assistant";
import { isAiConfigured } from "@/lib/ai/model";
import { AssistantView } from "@/components/assistant/assistant-view";

export default async function AssistantPage() {
  const conversations = await listConversations();
  return <AssistantView conversations={conversations} configured={isAiConfigured()} />;
}
```

- [ ] **Step 2: Client view** — `useChat` (matching the installed API), conversation list, composer, suggested prompts, disclaimer, and the unconfigured state. Sketch (adapt to the AI SDK version from Task 1; React Compiler is on, so NO manual memoization):

```tsx
"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Sparkles, Send, Plus, Trash2 } from "lucide-react";
import type { ConversationSummary } from "@/services/assistant";
import { deleteConversation } from "@/services/assistant";

const SUGGESTIONS = [
  "How much did I spend last month?",
  "Can I afford a ₹40,000 trip in March?",
  "Where can I cut back?",
  "Summarise my finances this month",
];

export function AssistantView({ conversations, configured }: { conversations: ConversationSummary[]; configured: boolean }) {
  const [conversationId, setConversationId] = useState<string | null>(null);

  if (!configured) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Sparkles className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 text-xl font-bold">Connect an AI key</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add a free <span className="font-medium">AI_API_KEY</span> (e.g. from console.groq.com) to <code>.env.local</code> and restart to enable the assistant.
        </p>
      </div>
    );
  }

  // useChat wiring per the installed AI SDK version (Task 1):
  //  v4: useChat({ api: "/api/assistant", body: { conversationId } })
  //  v5: useChat({ transport: new DefaultChatTransport({ api: "/api/assistant", body: { conversationId } }) })
  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: "/api/assistant",
    body: { conversationId },
  });

  // Render: a conversation list (New chat + past chats, delete affordance), the message
  // thread (whitespace-pre-wrap, "Looking at your data…" while streaming/tool rounds),
  // suggested-prompt chips when empty, and a composer (input + Send).
  // Use the existing UI tokens (Card/Button, bg-card, rounded-2xl, primary accents) to match the app.

  return (
    <div className="flex h-[calc(100dvh-8rem)] gap-4">
      {/* conversation list (desktop) / drawer (mobile) + thread + composer — build with app UI tokens */}
      {/* SUGGESTIONS render as clickable chips that set the input + submit */}
      {/* disclaimer line: "Insights, not professional financial advice." */}
    </div>
  );
}
```
> Flesh out the layout with the app's existing components/tokens (match `settings`/`about` styling). On mobile, put the conversation list behind a drawer/sheet. Wire suggestion chips to submit. "New chat" sets `conversationId = null` and clears the thread; selecting a past conversation loads it (fetch its messages via a server action / `getConversationMessages` passed as `initialMessages`). Delete calls `deleteConversation`.

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit` then `npx eslint "src/app/(app)/assistant/page.tsx" src/components/assistant/assistant-view.tsx` then `npx next build`.
Expected: clean; build lists `/assistant` and `/api/assistant`.
```bash
git add "src/app/(app)/assistant/page.tsx" src/components/assistant/assistant-view.tsx
git commit -m "feat(assistant): /assistant chat page (streamed, saved conversations)"
```

---

## Task 8: Nav entry

**Files:** Modify `src/lib/nav.ts`.

- [ ] **Step 1: Add Assistant to `PRIMARY_NAV`** (prominent — flagship feature). Add `Sparkles` to the lucide import and insert as the second item:

```ts
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: Home, color: "#16a34a" },
  { href: "/assistant", label: "Assistant", icon: Sparkles, color: "#0ea5e9" }, // sky
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight, color: "#3b82f6" },
  { href: "/budget", label: "Budget", icon: Wallet, color: "#f97316" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, color: "#8b5cf6" },
];
```

- [ ] **Step 2: Check the mobile bottom bar fit.** The bottom tab bar renders `[...PRIMARY_NAV, SETTINGS_NAV]` + a "More" button — now 5 primary + More + Settings. Run `npx next build`, then in the manual pass confirm the pill doesn't overflow on a 360px-wide screen; if it does, the icons already `shrink-0` and the active item expands — acceptable. (If genuinely cramped, fall back to placing Assistant in `SECONDARY_NAV` instead and note it.)

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit` then `npx eslint src/lib/nav.ts`.
```bash
git add src/lib/nav.ts
git commit -m "feat(assistant): add Assistant to the nav"
```

---

## Task 9: End-to-end verification + finish

**Files:** none (verification).

- [ ] **Step 1:** `npx vitest run` → all pass (incl. `assistant` title tests).
- [ ] **Step 2:** `npx tsc --noEmit` then `npx eslint .` → clean.
- [ ] **Step 3:** `npx next build` → succeeds; route list includes `/assistant` and `/api/assistant`.
- [ ] **Step 4: Manual walkthrough** — needs a key. Tell the user to add `AI_API_KEY=<free Groq key from console.groq.com>` to `.env.local` (optionally `AI_MODEL`/`AI_BASE_URL`), restart `npx next dev` (port 3050):
  - Open `/assistant`. With NO key → the "Connect an AI key" state shows; the rest of the app works.
  - With a key → ask "how much did I spend last month?", "can I afford ₹40k?", "where can I cut back?" — confirm answers reflect real data (cross-check a number), and the response streams.
  - "New chat" starts fresh; reload → the conversation appears in the list and resumes; delete removes it.
  - Confirm a logged-out POST to `/api/assistant` returns 401.
  - Mobile: bottom bar shows Assistant without overflow; conversation list reachable.
- [ ] **Step 5: Finish** — use **superpowers:finishing-a-development-branch** to merge `ai-assistant` into `main` after verification passes.

---

## Self-Review

**Spec coverage:** provider-agnostic free Groq default + env swap (T1,4) ✓ · read-only session-scoped tools over existing services (T5) ✓ · streaming tool-call loop route, 401 when logged out, 503 when unconfigured (T6) ✓ · saved per-user conversations + resume + delete (T2,3) ✓ · dedicated `/assistant` page + nav entry + suggestions + disclaimer + unconfigured state (T7,8) ✓ · title derivation tested (T3) ✓ · system prompt: INR, today, read-only, no-advice (T4) ✓ · AI-SDK version verified before coding (T1) ✓ · graceful no-key fallback ✓.

**Type/name consistency:** `assistantTools` defined in `tools.ts`, consumed by the route. `appendTurn`/`listConversations`/`getConversationMessages`/`deleteConversation`/`deriveTitle`/`ConversationSummary` defined in `assistant.ts`, used by the route + page + view. `getModel`/`isAiConfigured` in `model.ts`, used by route + page. `buildSystemPrompt` in `system-prompt.ts`, used by route. Env names `AI_API_KEY`/`AI_BASE_URL`/`AI_MODEL` consistent throughout.

**Placeholder scan:** The version-sensitive spots (step control, response helper, schema key, `useChat` wiring) are explicitly flagged with both v4/v5 variants and a Task-1 verification gate — deliberate (the SDK API is version-dependent), not placeholders. Tool field names + `currentMonth()` are flagged to confirm against the real services during implementation.
