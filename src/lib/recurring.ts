import type { ScopedDb } from "@/lib/user-scope";
import { monthBounds, nextMonthString } from "@/lib/date-range";
import { FIXED_EXPENSE_CATEGORIES } from "@/lib/categories";

export interface UpcomingExpense {
  description: string;
  category: string | null;
  expectedAmount: number;
  expectedDate: string;
  occurrences: number;
}

function normalizeDescription(description: string): string {
  return description.trim().toUpperCase().replace(/\s+/g, " ");
}

function daysInMonthUTC(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Same day-of-month as `sourceDate`, projected into `targetYear`/`targetMonthIndex`, clamped to that month's length. */
function projectDate(sourceDate: Date, targetYear: number, targetMonthIndex: number): Date {
  const day = Math.min(sourceDate.getUTCDate(), daysInMonthUTC(targetYear, targetMonthIndex));
  return new Date(Date.UTC(targetYear, targetMonthIndex, day));
}

/**
 * Detects recurring/fixed expenses (rent, subscriptions, insurance, ...) from
 * transaction history and projects each into the month right after `month`.
 *
 * Heuristic: a merchant is "recurring" if it appears in at least two distinct
 * months (looking back ~4 months) with an amount that doesn't vary by more
 * than ~15%, and it was still active in `month` or the month before it.
 */
export async function detectUpcomingFixedExpenses(
  tx: ScopedDb,
  userId: string,
  month: string,
  accountId?: string | null
): Promise<{ targetMonth: string; items: UpcomingExpense[] }> {
  const targetMonth = nextMonthString(month);
  const { end: referenceEnd } = monthBounds(month);
  const lookbackStart = new Date(referenceEnd);
  lookbackStart.setUTCMonth(lookbackStart.getUTCMonth() - 4);

  const transactions = await tx.transaction.findMany({
    where: {
      userId,
      ...(accountId ? { accountId } : {}),
      direction: "EXPENSE",
      isTransfer: false,
      transactionDate: { gte: lookbackStart, lt: referenceEnd },
    },
    include: { category: true },
    orderBy: { transactionDate: "asc" },
  });

  const groups = new Map<
    string,
    { originalDescription: string; category: string | null; occurrences: { date: Date; amount: number }[] }
  >();

  for (const tx of transactions) {
    const categoryName = tx.category?.name;
    if (!categoryName || !FIXED_EXPENSE_CATEGORIES.has(categoryName)) continue;

    const key = normalizeDescription(tx.description);
    const group = groups.get(key) ?? {
      originalDescription: tx.description.trim(),
      category: tx.category?.name ?? null,
      occurrences: [],
    };
    group.occurrences.push({ date: tx.transactionDate, amount: Number(tx.amount) });
    group.category = tx.category?.name ?? group.category;
    groups.set(key, group);
  }

  // A recurring expense must still be active: last seen in `month` itself or the month before it.
  const activeSince = new Date(referenceEnd);
  activeSince.setUTCMonth(activeSince.getUTCMonth() - 1);

  const items: UpcomingExpense[] = [];

  for (const group of groups.values()) {
    const { occurrences } = group;
    if (occurrences.length < 2) continue;

    const distinctMonths = new Set(occurrences.map((o) => `${o.date.getUTCFullYear()}-${o.date.getUTCMonth()}`));
    if (distinctMonths.size < 2) continue;

    const last = occurrences[occurrences.length - 1];
    if (last.date < activeSince) continue;

    const amounts = occurrences.map((o) => o.amount);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const maxDeviation = avg > 0 ? Math.max(...amounts.map((a) => Math.abs(a - avg) / avg)) : 1;
    if (maxDeviation > 0.15) continue; // too variable to call "fixed"

    const [targetYearStr, targetMonthStr] = targetMonth.split("-");
    const expectedDate = projectDate(last.date, Number(targetYearStr), Number(targetMonthStr) - 1);

    items.push({
      description: group.originalDescription,
      category: group.category,
      expectedAmount: Math.round(avg * 100) / 100,
      expectedDate: expectedDate.toISOString().slice(0, 10),
      occurrences: occurrences.length,
    });
  }

  items.sort((a, b) => (a.expectedDate < b.expectedDate ? -1 : 1));

  return { targetMonth, items };
}
