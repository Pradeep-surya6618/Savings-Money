"use client";

import { useState } from "react";
import { Undo2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { setAiActionsEnabled } from "@/lib/actions/settings";
import { undoAiAction } from "@/lib/actions/ai-actions";
import { toast } from "@/lib/toast-store";
import type { AiActionEntry } from "@/services/ai-actions";

export function AiActionsCard({ enabled, activity }: { enabled: boolean; activity: AiActionEntry[] }) {
  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState(activity);

  async function toggle() {
    const next = !on;
    setOn(next);
    setBusy(true);
    await setAiActionsEnabled(next);
    setBusy(false);
    toast.success(next ? "AI actions enabled" : "AI actions turned off");
  }

  async function undo(id: string) {
    const res = await undoAiAction(id);
    if (res.ok) {
      setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status: "undone" } : x)));
      toast.success("Change undone");
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">AI actions</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Let FuFi&rsquo;s assistant add or change your data (always asks before each change). Off = read-only.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          disabled={busy}
          onClick={toggle}
          className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition ${on ? "bg-primary" : "bg-card-elevated"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${on ? "left-[1.375rem]" : "left-0.5"}`} />
        </button>
      </div>

      <div className="border-t border-border pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent AI changes</p>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No changes yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                <span className={a.status === "undone" ? "text-muted-foreground line-through" : "text-foreground"}>
                  {a.summary}
                </span>
                {a.status === "applied" && (
                  <button
                    type="button"
                    onClick={() => undo(a.id)}
                    className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary transition hover:bg-primary/10"
                  >
                    <Undo2 className="h-3.5 w-3.5" /> Undo
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
