import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const messageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true },
);

export type MessageDoc = InferSchemaType<typeof messageSchema>;

export const Message: Model<MessageDoc> =
  (models.Message as Model<MessageDoc>) ?? model<MessageDoc>("Message", messageSchema);
