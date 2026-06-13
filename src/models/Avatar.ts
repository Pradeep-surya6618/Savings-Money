import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const avatarSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true, default: "image/webp" },
  },
  { timestamps: true },
);

export type AvatarDoc = InferSchemaType<typeof avatarSchema>;
export const Avatar: Model<AvatarDoc> =
  (models.Avatar as Model<AvatarDoc>) ?? model<AvatarDoc>("Avatar", avatarSchema);
