import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const savingsSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    currentAmount: { type: Number, required: true, default: 0, min: 0 },
    targetAmount: { type: Number, required: true, default: 0, min: 0 },
    monthlyContribution: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

export type SavingsDoc = InferSchemaType<typeof savingsSchema>;

export const Savings: Model<SavingsDoc> =
  (models.Savings as Model<SavingsDoc>) ?? model<SavingsDoc>("Savings", savingsSchema);
