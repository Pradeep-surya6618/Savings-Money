import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const allocationSchema = new Schema(
  {
    category: { type: String, required: true },
    amount: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const salarySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    month: { type: String, required: true },
    amount: { type: Number, required: true, default: 0 },
    receivedDate: { type: Date },
    allocations: { type: [allocationSchema], default: [] },
  },
  { timestamps: true },
);

salarySchema.index({ userId: 1, month: 1 }, { unique: true });

export type SalaryDoc = InferSchemaType<typeof salarySchema>;

/** Plain shape of an embedded allocation after `.lean()`. */
export type AllocationDoc = { category: string; amount: number };

export const Salary: Model<SalaryDoc> =
  (models.Salary as Model<SalaryDoc>) ?? model<SalaryDoc>("Salary", salarySchema);
