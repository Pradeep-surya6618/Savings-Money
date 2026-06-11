import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const loanSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    totalLoan: { type: Number, required: true, default: 0, min: 0 },
    paidAmount: { type: Number, required: true, default: 0, min: 0 },
    emiAmount: { type: Number, required: true, default: 0, min: 0 },
    startDate: { type: Date },
  },
  { timestamps: true },
);

export type LoanDoc = InferSchemaType<typeof loanSchema>;

export const Loan: Model<LoanDoc> =
  (models.Loan as Model<LoanDoc>) ?? model<LoanDoc>("Loan", loanSchema);
