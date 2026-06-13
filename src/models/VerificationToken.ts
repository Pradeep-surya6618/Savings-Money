import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const verificationTokenSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    name: { type: String }, // collected at signup; applied to the User on completeSignup
    purpose: { type: String, enum: ["signup", "reset"], required: true },
    secretHash: { type: String, required: true },
    verified: { type: Boolean, default: false },
    ticketHash: { type: String },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

export type VerificationTokenDoc = InferSchemaType<typeof verificationTokenSchema>;

export const VerificationToken: Model<VerificationTokenDoc> =
  (models.VerificationToken as Model<VerificationTokenDoc>) ??
  model<VerificationTokenDoc>("VerificationToken", verificationTokenSchema);
