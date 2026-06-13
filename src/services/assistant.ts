"use server";

import { connectDB } from "@/lib/mongodb/connect";
import { getSession } from "@/lib/auth/session";
import { Conversation } from "@/models/Conversation";
import { Message } from "@/models/Message";
import { deriveTitle } from "@/services/derive-title";

export type ChatTurn = { id: string; role: "user" | "assistant"; content: string };
export type ConversationSummary = { id: string; title: string; updatedAt: string };

async function requireUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.userId ?? null;
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const userId = await requireUserId();
  if (!userId) return [];
  await connectDB();
  const rows = await Conversation.find({ userId }).sort({ updatedAt: -1 }).limit(50).lean();
  return rows.map((c) => ({
    id: String(c._id),
    title: c.title,
    updatedAt: ((c as unknown as { updatedAt: Date }).updatedAt).toISOString(),
  }));
}

export async function getConversationMessages(conversationId: string): Promise<ChatTurn[]> {
  const userId = await requireUserId();
  if (!userId) return [];
  await connectDB();
  const convo = await Conversation.findOne({ _id: conversationId, userId }).lean();
  if (!convo) return [];
  const rows = await Message.find({ conversationId, userId }).sort({ createdAt: 1 }).lean();
  return rows.map((m) => ({
    id: String(m._id),
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
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

/** Create a fresh conversation owned by the current user, titled from the first message.
 *  Returns the new conversation id. */
export async function createConversation(firstMessage: string): Promise<string> {
  const userId = await requireUserId();
  if (!userId) throw new Error("unauthorized");
  await connectDB();
  const convo = await Conversation.create({ userId, title: deriveTitle(firstMessage) });
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
