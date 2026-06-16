import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const aiActionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, required: true },
    summary: { type: String, required: true },
    // Opaque inverse payload (discriminated by `op`) used by undoAiAction.
    inverse: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ["applied", "undone"], default: "applied" },
  },
  { timestamps: true },
);

aiActionSchema.index({ userId: 1, createdAt: -1 });

export type AiActionDoc = InferSchemaType<typeof aiActionSchema>;

export const AiAction: Model<AiActionDoc> =
  (models.AiAction as Model<AiActionDoc>) ?? model<AiActionDoc>("AiAction", aiActionSchema);
