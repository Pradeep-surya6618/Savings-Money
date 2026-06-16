import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Settings } from "@/models/Settings";

/** Whether the AI assistant may perform writes. Defaults to true when unset. */
export async function getAiActionsEnabled(): Promise<boolean> {
  await connectDB();
  const { user } = await getCurrentUser();
  const doc = await Settings.findOne({ userId: user.id }).lean();
  return doc?.aiActionsEnabled ?? true;
}
