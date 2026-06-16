"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { History, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteConversation, type ConversationSummary } from "@/services/assistant";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";

const RECENT_LIMIT = 5;

export function SidebarChats({ conversations }: { conversations: ConversationSummary[] }) {
  const router = useRouter();
  const activeId = useSearchParams().get("c");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? conversations : conversations.slice(0, RECENT_LIMIT);

  async function confirmDelete() {
    const id = pendingDelete;
    setPendingDelete(null);
    if (!id) return;
    const res = await deleteConversation(id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Chat deleted");
    // Deleting the open chat: replace the URL so the stale ?c= leaves it.
    // (deleteConversation revalidates the list; a refresh here would race the navigation.)
    if (id === activeId) router.replace("/assistant");
    else router.refresh();
  }

  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col">
      <Link
        href="/assistant"
        className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary-end px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-primary/30 transition hover:opacity-90"
      >
        <Plus className="h-4 w-4" /> New chat
      </Link>
      {conversations.length > 0 && (
        <p className="mb-1 mt-3 shrink-0 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Chats
        </p>
      )}

      {/* Only this section scrolls; the menu + New Chat above stay fixed. */}
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide">
        <div className="space-y-0.5">
          {visible.map((c) => {
            const active = c.id === activeId;
            return (
              <div
                key={c.id}
                className={cn(
                  "group relative flex items-center gap-1 rounded-xl pr-1 transition",
                  active ? "bg-primary/10" : "hover:bg-card-elevated",
                )}
              >
                <Link
                  href={`/assistant?c=${c.id}`}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-sm",
                    active ? "font-semibold text-primary" : "text-muted-foreground",
                  )}
                >
                  <History
                    className={cn("h-3.5 w-3.5 shrink-0", active ? "text-primary" : "text-muted-foreground/70")}
                  />
                  <span className="truncate">{c.title}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setPendingDelete(c.id)}
                  aria-label="Delete chat"
                  className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-negative/10 hover:text-negative group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        {conversations.length > RECENT_LIMIT && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="mt-1 cursor-pointer px-3 py-1.5 text-left text-xs font-semibold text-primary transition hover:underline"
          >
            {showAll ? "Show less" : "View all chats"}
          </button>
        )}
      </div>

      <Dialog open={pendingDelete !== null} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <DialogContent title="Delete chat?">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This permanently deletes this conversation and all its messages. This can&rsquo;t be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPendingDelete(null)}>Cancel</Button>
              <Button onClick={() => void confirmDelete()} className="from-negative to-negative">Delete</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
