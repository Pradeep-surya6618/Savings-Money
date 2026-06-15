"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteConversation, type ConversationSummary } from "@/services/assistant";
import { cn } from "@/lib/utils";

export function SidebarChats({ conversations }: { conversations: ConversationSummary[] }) {
  const router = useRouter();
  const activeId = useSearchParams().get("c");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  async function confirmDelete() {
    const id = pendingDelete;
    setPendingDelete(null);
    if (!id) return;
    await deleteConversation(id);
    if (id === activeId) router.push("/assistant");
    router.refresh();
  }

  return (
    <div className="mt-3 flex min-h-0 flex-col">
      <Link
        href="/assistant"
        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary-end px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-primary/30 transition hover:opacity-90"
      >
        <Plus className="h-4 w-4" /> New chat
      </Link>
      {conversations.length > 0 && (
        <p className="mb-1 mt-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Chats
        </p>
      )}
      <div className="space-y-0.5">
        {conversations.map((c) => {
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
                  "min-w-0 flex-1 truncate px-3 py-2 text-sm",
                  active ? "font-semibold text-primary" : "text-muted-foreground",
                )}
              >
                {c.title}
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
