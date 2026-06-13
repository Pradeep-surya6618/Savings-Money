"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Sparkles, Send, Plus, Trash2, MessagesSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  createConversation,
  deleteConversation,
  getConversationMessages,
  type ConversationSummary,
} from "@/services/assistant";

const SUGGESTIONS = [
  "How much did I spend last month?",
  "Can I afford a ₹40,000 trip in March?",
  "Where can I cut back?",
  "Summarise my finances this month",
];

function textOf(message: UIMessage): string {
  return message.parts
    .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function AssistantView({
  conversations,
  configured,
}: {
  conversations: ConversationSummary[];
  configured: boolean;
}) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [listOpen, setListOpen] = useState(false);

  const { messages, sendMessage, setMessages, status, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/assistant" }),
    onFinish: () => router.refresh(),
  });

  const busy = status === "submitted" || status === "streaming";

  if (!configured) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-xl font-bold">Connect an AI key</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add a free <span className="font-medium">AI_API_KEY</span> (e.g. from console.groq.com) to{" "}
          <code className="rounded bg-card-elevated px-1 py-0.5 text-xs">.env.local</code> and restart to enable the
          assistant.
        </p>
      </div>
    );
  }

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    // New chat: create the conversation up front so the route persists turns
    // against a real id and the request body carries the right scope.
    let id = conversationId;
    if (!id) {
      id = await createConversation(trimmed);
      setConversationId(id);
    }
    await sendMessage({ text: trimmed }, { body: { conversationId: id } });
  }

  function newChat() {
    if (busy) return;
    setConversationId(null);
    setMessages([]);
    setInput("");
    setListOpen(false);
  }

  async function openConversation(id: string) {
    if (busy) return;
    setListOpen(false);
    const turns = await getConversationMessages(id);
    setConversationId(id);
    setMessages(
      turns.map((t) => ({ id: t.id, role: t.role, parts: [{ type: "text", text: t.content }] })),
    );
  }

  async function removeConversation(id: string) {
    await deleteConversation(id);
    if (id === conversationId) newChat();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight">Assistant</h1>
          <p className="text-xs text-muted-foreground">Ask about your money — grounded in your own data.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setListOpen(true)}
          className="ml-auto h-9 px-3 lg:hidden"
          aria-label="Conversations"
        >
          <MessagesSquare className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Conversation list — desktop sidebar */}
        <Card className="hidden h-[calc(100dvh-13rem)] flex-col p-2 lg:flex lg:sticky lg:top-24">
          <ConversationList
            conversations={conversations}
            activeId={conversationId}
            onNew={newChat}
            onOpen={openConversation}
            onDelete={removeConversation}
          />
        </Card>

        {/* Chat column */}
        <Card className="flex h-[calc(100dvh-13rem)] flex-col p-0">
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
                <div>
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Sparkles className="h-6 w-6" />
                  </span>
                  <p className="mt-3 text-sm font-medium">How can I help with your finances?</p>
                  <p className="mt-1 text-xs text-muted-foreground">Pick a prompt or type your own.</p>
                </div>
                <div className="flex max-w-md flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => submit(s)}
                      className="cursor-pointer rounded-full border border-border bg-card-elevated/50 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                      m.role === "user"
                        ? "bg-primary text-white"
                        : "border border-border bg-card-elevated/50 text-foreground",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{textOf(m)}</p>
                  </div>
                </div>
              ))
            )}

            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-card-elevated/50 px-3.5 py-2.5 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                  Looking at your data…
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-negative/30 bg-negative/10 px-3.5 py-2.5 text-sm text-negative">
                  Something went wrong. Please check your AI key or try again.
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit(input);
              }}
              className="flex items-end gap-2"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void submit(input);
                  }
                }}
                rows={1}
                placeholder="Ask about your money…"
                disabled={busy}
                className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary disabled:opacity-60"
              />
              {busy ? (
                <Button type="button" variant="outline" onClick={() => stop()} className="h-10 shrink-0 px-3">
                  Stop
                </Button>
              ) : (
                <Button type="submit" disabled={!input.trim()} className="h-10 shrink-0 px-3" aria-label="Send">
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </form>
            <p className="mt-2 px-1 text-center text-[11px] text-muted-foreground">
              Insights, not professional financial advice.
            </p>
          </div>
        </Card>
      </div>

      {/* Conversation list — mobile drawer */}
      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent title="Conversations" className="lg:hidden">
          <ConversationList
            conversations={conversations}
            activeId={conversationId}
            onNew={newChat}
            onOpen={openConversation}
            onDelete={removeConversation}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConversationList({
  conversations,
  activeId,
  onNew,
  onOpen,
  onDelete,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Button variant="outline" onClick={onNew} className="mb-2 w-full justify-start gap-2">
        <Plus className="h-4 w-4" />
        New chat
      </Button>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">No conversations yet.</p>
        ) : (
          conversations.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group flex items-center gap-1 rounded-xl pr-1 transition",
                c.id === activeId ? "bg-primary/10" : "hover:bg-card-elevated",
              )}
            >
              <button
                type="button"
                onClick={() => onOpen(c.id)}
                className={cn(
                  "min-w-0 flex-1 cursor-pointer truncate px-3 py-2 text-left text-sm",
                  c.id === activeId ? "font-semibold text-primary" : "text-foreground",
                )}
              >
                {c.title}
              </button>
              <button
                type="button"
                onClick={() => onDelete(c.id)}
                aria-label="Delete conversation"
                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-negative/10 hover:text-negative group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
