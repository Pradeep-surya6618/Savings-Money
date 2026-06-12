import { connectDB } from "@/lib/mongodb/connect";
import { getCurrentUser } from "@/lib/user";
import { Salary } from "@/models/Salary";
import { Savings } from "@/models/Savings";
import { NotificationState } from "@/models/NotificationState";
import { getBudget } from "@/services/budget";
import { currentMonth } from "@/lib/month";
import { formatCurrency } from "@/lib/utils";
import { TXN_CATEGORY_MAP, type TxnCategoryKey } from "@/lib/transaction-categories";
import { buildNotifications, type NotificationDTO } from "@/lib/notifications-math";

export type NotificationsResult = { items: NotificationDTO[]; unreadCount: number };

/** Derive the live notification list for the current user. Defensive: any read
 *  failure or missing data yields an empty result so the bell never crashes the app. */
export async function getNotifications(): Promise<NotificationsResult> {
  try {
    await connectDB();
    const { user, settings } = await getCurrentUser();
    const month = currentMonth();

    const [salaryDoc, savingsDoc, stateDoc, budget] = await Promise.all([
      Salary.findOne({ userId: user.id, month }).lean(),
      Savings.findOne({ userId: user.id }).lean(),
      NotificationState.findOne({ userId: user.id }).lean(),
      getBudget(month),
    ]);

    const budgetRows = (budget?.reconciliation.rows ?? []).map((r) => ({
      category: r.category,
      planned: r.planned,
      actual: r.actual,
    }));

    return buildNotifications({
      month,
      salaryAmount: salaryDoc ? salaryDoc.amount : null,
      budgetRows,
      savings: {
        current: savingsDoc?.currentAmount ?? 0,
        target: savingsDoc?.targetAmount ?? 0,
      },
      prefs: settings.notifyPrefs,
      state: {
        readKeys: stateDoc?.readKeys ?? [],
        dismissedKeys: stateDoc?.dismissedKeys ?? [],
      },
      format: (n) => formatCurrency(n, { currency: settings.currency, locale: settings.locale }),
      categoryLabel: (k) => TXN_CATEGORY_MAP[k as TxnCategoryKey]?.label ?? k,
    });
  } catch {
    return { items: [], unreadCount: 0 };
  }
}
