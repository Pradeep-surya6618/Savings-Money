import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { LOAN_TYPE_KEYS } from "@/lib/loan-types";

const loanSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: LOAN_TYPE_KEYS, required: true, default: "other" },
    name: { type: String, trim: true },
    totalLoan: { type: Number, required: true, default: 0, min: 0 },
    paidAmount: { type: Number, required: true, default: 0, min: 0 },
    emiAmount: { type: Number, required: true, default: 0, min: 0 },
    startDate: { type: Date },
  },
  { timestamps: true },
);

loanSchema.index({ userId: 1, createdAt: -1 });

export type LoanDoc = InferSchemaType<typeof loanSchema>;

export const Loan: Model<LoanDoc> =
  (models.Loan as Model<LoanDoc>) ?? model<LoanDoc>("Loan", loanSchema);
