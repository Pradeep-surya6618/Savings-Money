"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses, isToolUIPart, getToolName, type UIMessage } from "ai";
import { Sparkles, Send, Plus, Trash2, MessagesSquare, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ActionConfirmCard } from "./action-confirm-card";
import type { AiActionKind } from "@/lib/ai/action-kinds";
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

/** Copy a message — hover-revealed on desktop, always visible on mobile. */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy message"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center self-end rounded-lg text-muted-foreground opacity-100 transition hover:bg-card-elevated hover:text-foreground lg:opacity-0 lg:group-hover:opacity-100"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-positive" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function AssistantView({
  conversations,
  configured,
}: {
  conversations: ConversationSummary[];
  configured: boolean;
}) {
  const router = useRouter();
  const urlChat = useSearchParams().get("c");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const { messages, sendMessage, setMessages, status, stop, addToolApprovalResponse } = useChat({
    transport: new DefaultChatTransport({ api: "/api/assistant" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onFinish: () => router.refresh(),
  });

  const busy = status === "submitted" || status === "streaming";

  // The open conversation is driven by the `?c=<id>` URL param. `loadedRef` tracks
  // which conversation's messages are currently loaded so we don't reload (and clobber)
  // the active chat — including the one we just created for a brand-new message.
  const loadedRef = useRef<string | null>(null);
  useEffect(() => {
    if (urlChat === loadedRef.current) return;
    loadedRef.current = urlChat;
    setConversationId(urlChat);
    if (!urlChat) {
      setMessages([]);
      return;
    }
    void getConversationMessages(urlChat).then((turns) => {
      setMessages(turns.map((t) => ({ id: t.id, role: t.role, parts: [{ type: "text", text: t.content }] })));
    });
  }, [urlChat, setMessages]);

  if (!configured) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Icons/FuFi-AI.png" alt="FuFi's AI" className="mx-auto h-24 w-24 rounded-2xl bg-black object-cover shadow-lg shadow-primary/20" />
        <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight">Connect an AI key</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add a free <span className="font-medium text-foreground">AI_API_KEY</span> (e.g. from console.groq.com) to{" "}
          <code className="rounded bg-card-elevated px-1.5 py-0.5 text-xs">.env.local</code> and restart to enable the
          assistant.
        </p>
      </div>
    );
  }

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    // New chat: create the conversation up front so the route persists turns against
    // a real id, reflect it in the URL, and pin loadedRef so the sync effect won't reload it.
    let id = conversationId;
    if (!id) {
      id = await createConversation(trimmed);
      loadedRef.current = id;
      setConversationId(id);
      router.replace(`/assistant?c=${id}`);
    }
    await sendMessage({ text: trimmed }, { body: { conversationId: id } });
  }

  function newChat() {
    if (busy) return;
    setInput("");
    setListOpen(false);
    router.push("/assistant");
  }

  function openConversation(id: string) {
    if (busy) return;
    setListOpen(false);
    router.push(`/assistant?c=${id}`);
  }

  function requestDelete(id: string) {
    setListOpen(false);
    setPendingDelete(id);
  }

  async function confirmDelete() {
    const id = pendingDelete;
    setPendingDelete(null);
    if (!id) return;
    await deleteConversation(id);
    if (id === conversationId) router.push("/assistant");
    router.refresh();
  }

  return (
    <div data-full-bleed className="space-y-5 lg:-mx-8 lg:-mt-8 lg:-mb-10 lg:h-[calc(100dvh-5.25rem)] lg:space-y-0">
      {/* Header — mobile only; desktop shows the brand at the top of the sidebar */}
      <div className="flex items-center gap-3 lg:hidden">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-end text-white shadow-lg shadow-primary/30">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-extrabold tracking-tight">FuFi&rsquo;s AI</h1>
          <p className="text-xs text-muted-foreground">Ask about your money — grounded in your own data.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setListOpen(true)}
          className="ml-auto h-9 px-3"
          aria-label="Conversations"
        >
          <MessagesSquare className="h-4 w-4" />
        </Button>
      </div>

      <div className="lg:h-full">
        {/* Chat column — full width (conversation list now lives in the app sidebar) */}
        <div className="flex h-[calc(100dvh-14rem)] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm lg:h-full lg:rounded-none lg:border-0 lg:shadow-none">
          <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/Icons/FuFi-AI.png" alt="FuFi's AI" className="mx-auto h-24 w-24 rounded-3xl bg-black object-cover shadow-lg shadow-primary/20" />
                  <p className="mt-4 font-display text-lg font-bold tracking-tight">How can I help with your finances?</p>
                  <p className="mt-1 text-sm text-muted-foreground">Pick a prompt or type your own.</p>
                </div>
                <div className="flex max-w-lg flex-wrap justify-center gap-2.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => submit(s)}
                      className="cursor-pointer rounded-full border border-border bg-card-elevated/60 px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground hover:shadow-md"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => {
                const text = textOf(m);
                const toolParts = m.parts.filter(isToolUIPart);
                if (m.role === "assistant" && !text.trim() && toolParts.length === 0) return null;
                return (
                  <div key={m.id} className="space-y-2">
                    {(text.trim() || m.role === "user") && (
                      <div className={cn("group flex items-end gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                        {m.role === "assistant" && (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-end text-white shadow-sm shadow-primary/30">
                            <Sparkles className="h-4 w-4" />
                          </span>
                        )}
                        {m.role === "user" && <CopyButton text={text} />}
                        <div
                          className={cn(
                            "max-w-[82%] px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                            m.role === "user"
                              ? "rounded-3xl rounded-br-md bg-gradient-to-br from-primary to-primary-end text-white shadow-primary/25"
                              : "rounded-3xl rounded-bl-md border border-border bg-card-elevated/60 text-foreground",
                          )}
                        >
                          <p className="whitespace-pre-wrap">{text}</p>
                        </div>
                        {m.role === "assistant" && text.trim() && <CopyButton text={text} />}
                      </div>
                    )}
                    {toolParts.map((part) => {
                      const name = getToolName(part) as string;
                      if (
                        !name.startsWith("add_") && !name.startsWith("edit_") && !name.startsWith("delete_") &&
                        !name.startsWith("set_") && !name.startsWith("contribute_") && !name.startsWith("record_")
                      ) {
                        return null;
                      }
                      const out =
                        part.state === "output-available"
                          ? (part.output as { ok: boolean; logId?: string; summary?: string; error?: string })
                          : undefined;
                      return (
                        <div key={part.toolCallId} className="flex justify-start pl-10">
                          <ActionConfirmCard
                            kind={name as AiActionKind}
                            state={part.state}
                            input={part.input}
                            output={out}
                            errorText={part.state === "output-error" ? part.errorText : undefined}
                            approvalId={part.approval?.id}
                            respond={addToolApprovalResponse}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}

            {busy && (
              <div className="flex items-end gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-end text-white shadow-sm shadow-primary/30">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                </span>
                <div className="flex items-center gap-1.5 rounded-3xl rounded-bl-md border border-border bg-card-elevated/60 px-4 py-3.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60" />
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
          <div className="border-t border-border bg-card/80 p-3 sm:p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit(input);
              }}
              className="flex items-end gap-2 rounded-2xl border border-border bg-card px-2 py-1.5 shadow-sm transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
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
                className="max-h-32 min-h-[2.25rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none disabled:opacity-60"
              />
              {busy ? (
                <button
                  type="button"
                  onClick={() => stop()}
                  className="flex h-9 shrink-0 cursor-pointer items-center rounded-xl border border-border px-3 text-sm font-medium text-muted-foreground transition hover:bg-card-elevated hover:text-foreground"
                >
                  Stop
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Send"
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-end text-white shadow-sm shadow-primary/30 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </form>
            <p className="mt-2.5 text-center text-[11px] text-muted-foreground">
              Insights, not professional financial advice.
            </p>
          </div>
        </div>
      </div>

      {/* Conversation list — mobile drawer */}
      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent title="Conversations" className="lg:hidden">
          <ConversationList
            conversations={conversations}
            activeId={conversationId}
            onNew={newChat}
            onOpen={openConversation}
            onDelete={requestDelete}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={pendingDelete !== null} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <DialogContent title="Delete chat?">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This permanently deletes this conversation and all its messages. This can&rsquo;t be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPendingDelete(null)}>
                Cancel
              </Button>
              <Button onClick={() => void confirmDelete()} className="from-negative to-negative">
                Delete
              </Button>
            </div>
          </div>
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
      <button
        type="button"
        onClick={onNew}
        className="mb-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-primary to-primary-end px-3 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/30 transition hover:opacity-90"
      >
        <Plus className="h-4 w-4" />
        New chat
      </button>
      <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Chats</p>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">No conversations yet.</p>
        ) : (
          conversations.map((c) => {
            const active = c.id === activeId;
            return (
              <div
                key={c.id}
                className={cn(
                  "group relative flex items-center gap-1 rounded-xl pr-1 transition",
                  active ? "bg-primary/10" : "hover:bg-card-elevated",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                )}
                <button
                  type="button"
                  onClick={() => onOpen(c.id)}
                  className={cn(
                    "min-w-0 flex-1 cursor-pointer truncate px-3 py-2 text-left text-sm",
                    active ? "font-semibold text-primary" : "text-foreground",
                  )}
                >
                  {c.title}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(c.id)}
                  aria-label="Delete conversation"
                  className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground opacity-100 transition hover:bg-negative/10 hover:text-negative lg:opacity-0 lg:group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
