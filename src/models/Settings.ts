import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const settingsSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
    currency: { type: String, default: "INR" },
    locale: { type: String, default: "en-IN" },
  },
  { timestamps: true },
);

export type SettingsDoc = InferSchemaType<typeof settingsSchema>;

export const Settings: Model<SettingsDoc> =
  (models.Settings as Model<SettingsDoc>) ?? model<SettingsDoc>("Settings", settingsSchema);
