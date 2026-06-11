import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const settingsSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
    currency: { type: String, default: "INR" },
    locale: { type: String, default: "en-IN" },
    language: { type: String, default: "English" },
    dateFormat: { type: String, default: "DD MMM YYYY" },
    firstDayOfWeek: { type: String, default: "Monday" },
    defaultView: { type: String, default: "Home" },
    openingBalance: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

export type SettingsDoc = InferSchemaType<typeof settingsSchema>;

export const Settings: Model<SettingsDoc> =
  (models.Settings as Model<SettingsDoc>) ?? model<SettingsDoc>("Settings", settingsSchema);
