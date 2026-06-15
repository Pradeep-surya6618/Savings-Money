"use server";

import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { AiAction } from "@/models/AiAction";
import { type AiActionKind } from "@/lib/ai/action-kinds";
import { applyAiAction, applyInverse } from "@/lib/ai/action-gateway";

export type ConfirmResult =
  | { ok: true; logId: string; summary: string }
  | { ok: false; error: string };

/** Perform an AI-proposed write and record it for undo/audit. Called by the write
 *  tool's `execute` (server-side, only after the user approved the proposal). */
export async function confirmAiAction(kind: AiActionKind, input: unknown): Promise<ConfirmResult> {
  const res = await applyAiAction(kind, input);
  if (!res.ok) return res;

  await connectDB();
  const { user } = await getCurrentUser();
  const log = await AiAction.create({
    userId: user.id,
    kind,
    summary: res.summary,
    inverse: res.inverse,
    status: "applied",
  });
  return { ok: true, logId: String(log._id), summary: res.summary };
}

export async function undoAiAction(logId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await connectDB();
  const { user } = await getCurrentUser();
  const log = await AiAction.findOne({ _id: logId, userId: user.id });
  if (!log) return { ok: false, error: "Action not found" };
  if (log.status === "undone") return { ok: false, error: "Already undone" };

  await applyInverse(log.inverse as Parameters<typeof applyInverse>[0]);
  log.status = "undone";
  await log.save();
  return { ok: true };
}
