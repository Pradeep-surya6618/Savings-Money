import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Transaction } from "@/models/Transaction";

export type TransactionDTO = {
  id: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string; // ISO
  notes: string | null;
};

export async function listTransactions(): Promise<TransactionDTO[]> {
  await connectDB();
  const { user } = await getCurrentUser();
  const docs = await Transaction.find({ userId: user.id })
    .sort({ date: -1, createdAt: -1 })
    .lean();
  return docs.map((d) => ({
    id: String(d._id),
    title: d.title,
    amount: d.amount,
    // InferSchemaType widens the enum field to `string`; the cast restores the literal union.
    type: d.type as "income" | "expense",
    category: d.category,
    date: new Date(d.date).toISOString(),
    notes: d.notes || null,
  }));
}
