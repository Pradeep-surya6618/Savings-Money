import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const conversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, default: "New chat" },
  },
  { timestamps: true },
);

export type ConversationDoc = InferSchemaType<typeof conversationSchema>;

export const Conversation: Model<ConversationDoc> =
  (models.Conversation as Model<ConversationDoc>) ?? model<ConversationDoc>("Conversation", conversationSchema);
