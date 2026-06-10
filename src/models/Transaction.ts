import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const transactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    category: { type: String, required: true },
    date: { type: Date, required: true },
    notes: { type: String },
  },
  { timestamps: true },
);

transactionSchema.index({ userId: 1, date: -1 });

export type TransactionDoc = InferSchemaType<typeof transactionSchema>;

export const Transaction: Model<TransactionDoc> =
  (models.Transaction as Model<TransactionDoc>) ?? model<TransactionDoc>("Transaction", transactionSchema);
