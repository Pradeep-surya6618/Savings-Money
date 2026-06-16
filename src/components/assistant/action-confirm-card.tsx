"use client";

import { useState } from "react";
import { AlertTriangle, Check, Loader2, Undo2, X } from "lucide-react";
import { isLargeAmount, summarizeAction, type AiActionKind } from "@/lib/ai/action-kinds";
import { undoAiAction } from "@/lib/actions/ai-actions";
import { toast } from "@/lib/toast-store";

type ToolPartState =
  | "input-streaming"
  | "input-available"
  | "approval-requested"
  | "approval-responded"
  | "output-available"
  | "output-error"
  | "output-denied";

type ActionOutput = { ok: boolean; logId?: string; summary?: string; error?: string };
type ApprovalRespond = (opts: { id: string; approved: boolean }) => void;

/** Renders one AI write tool part across its lifecycle:
 *  approval-requested → confirm card; output-available → done + undo; denied/error → status. */
export function ActionConfirmCard({
  kind,
  state,
  input,
  output,
  errorText,
  approvalId,
  respond,
}: {
  kind: AiActionKind;
  state: ToolPartState;
  input: unknown;
  output?: ActionOutput;
  errorText?: string;
  approvalId?: string;
  respond: ApprovalRespond;
}) {
  const [undone, setUndone] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const large = input ? isLargeAmount(kind, input) : false;
  const summary = input ? summarizeAction(kind, input) : "";

  if (state === "approval-requested" && approvalId) {
    return (
      <div className="max-w-[82%] space-y-3 rounded-2xl border border-border bg-card-elevated/70 p-3.5 text-sm shadow-sm">
        <p className="font-medium text-foreground">{summary}</p>
        {large && (
          <p className="flex items-center gap-2 rounded-lg bg-warning/10 px-2.5 py-1.5 text-xs text-warning">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> This is a large or irreversible change — please double-check.
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => respond({ id: approvalId, approved: true })}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-br from-primary to-primary-end px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <Check className="h-3.5 w-3.5" /> Confirm
          </button>
          <button
            type="button"
            onClick={() => respond({ id: approvalId, approved: false })}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-medium text-muted-foreground transition hover:bg-card hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  if (state === "approval-responded") {
    return (
      <div className="max-w-[82%] rounded-2xl border border-border bg-card-elevated/70 px-3.5 py-2.5 text-sm text-muted-foreground">
        <Loader2 className="mr-2 inline h-3.5 w-3.5 animate-spin" /> Applying…
      </div>
    );
  }

  if (state === "output-denied") {
    return (
      <div className="max-w-[82%] rounded-2xl border border-border bg-card-elevated/40 px-3.5 py-2.5 text-sm text-muted-foreground">
        Cancelled — nothing was changed.
      </div>
    );
  }

  if (state === "output-error" || (output && !output.ok)) {
    return (
      <div className="max-w-[82%] rounded-2xl border border-negative/30 bg-negative/10 px-3.5 py-2.5 text-sm text-negative">
        Couldn’t apply: {output?.error ?? errorText ?? "Something went wrong."}
      </div>
    );
  }

  if (state === "output-available" && output?.ok) {
    return (
      <div className="flex max-w-[82%] items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-3.5 py-2.5 text-sm">
        <span className="flex items-center gap-2 text-foreground">
          <Check className="h-4 w-4 text-primary" /> {undone ? "Undone." : (output.summary ?? "Done.")}
        </span>
        {!undone && output.logId && (
          <button
            type="button"
            disabled={undoing}
            onClick={async () => {
              setUndoing(true);
              const res = await undoAiAction(output.logId!);
              setUndoing(false);
              if (res.ok) {
                setUndone(true);
                toast.success("Change undone");
              } else {
                toast.error(res.error);
              }
            }}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-primary transition hover:bg-primary/10 disabled:opacity-50"
          >
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </button>
        )}
      </div>
    );
  }

  return null;
}
