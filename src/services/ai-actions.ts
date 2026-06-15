import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { AiAction } from "@/models/AiAction";

export type AiActionEntry = { id: string; summary: string; status: "applied" | "undone"; at: string };

export async function listAiActions(limit = 30): Promise<AiActionEntry[]> {
  await connectDB();
  const { user } = await getCurrentUser();
  const docs = await AiAction.find({ userId: user.id }).sort({ createdAt: -1 }).limit(limit).lean();
  return docs.map((d) => ({
    id: String(d._id),
    summary: d.summary,
    status: d.status as "applied" | "undone",
    at: new Date(d.createdAt as Date).toISOString(),
  }));
}
