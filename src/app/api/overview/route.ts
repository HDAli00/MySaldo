import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { maskIban } from "@/lib/iban";
import { assignChartColors, categoryColorVar } from "@/lib/categories";
import { dateKey, monthBounds, toMonthString } from "@/lib/date-range";
import { getCurrentAppUser } from "@/lib/require-user";
import { withUserScope } from "@/lib/user-scope";

const MAX_CATEGORY_SLOTS = 7; // + one "Other" bucket, per the dataviz 8-series cap

export async function GET(request: NextRequest) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const accountId = params.get("accountId");

  return withUserScope(user.id, async (tx) => {
    let month = params.get("month");
    if (!month) {
      const latest = await tx.transaction.findFirst({
        where: { userId: user.id, ...(accountId ? { accountId } : {}) },
        orderBy: { transactionDate: "desc" },
      });
      month = toMonthString(latest?.transactionDate ?? new Date());
    }
    const { start, end } = monthBounds(month);

    const where: Prisma.TransactionWhereInput = {
      userId: user.id,
      transactionDate: { gte: start, lt: end },
      ...(accountId ? { accountId } : {}),
    };

    const [transactions, account] = await Promise.all([
      tx.transaction.findMany({
        where,
        include: { category: true, account: true },
        orderBy: { transactionDate: "desc" },
      }),
      accountId ? tx.account.findUnique({ where: { id: accountId } }) : null,
    ]);

    let income = 0;
    let expenses = 0;
    const categoryTotals = new Map<string, number>();
    const dailyTotals = new Map<string, { income: number; expense: number }>();

    for (const t of transactions) {
      const amount = Number(t.amount);
      const day = dateKey(t.transactionDate);
      const dayEntry = dailyTotals.get(day) ?? { income: 0, expense: 0 };

      if (t.isTransfer) {
        // Transfers between the user's own accounts are excluded from income/expense
        // and from the category breakdown entirely — they are not spending.
        dailyTotals.set(day, dayEntry);
        continue;
      }

      if (t.direction === "INCOME") {
        income += amount;
        dayEntry.income += amount;
      } else {
        expenses += amount;
        dayEntry.expense += amount;
        const categoryName = t.category?.name ?? "Uncategorized";
        categoryTotals.set(categoryName, (categoryTotals.get(categoryName) ?? 0) + amount);
      }
      dailyTotals.set(day, dayEntry);
    }

    const sortedCategories = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1]);
    const topCategories = sortedCategories.slice(0, MAX_CATEGORY_SLOTS);
    const otherTotal = sortedCategories
      .slice(MAX_CATEGORY_SLOTS)
      .reduce((sum, [, amount]) => sum + amount, 0);

    const chartColors = assignChartColors(topCategories.map(([name]) => name));
    const categoryBreakdown = topCategories.map(([name, amount]) => ({
      name,
      amount: Math.round(amount * 100) / 100,
      color: chartColors.get(name) ?? categoryColorVar("gray"),
    }));
    if (otherTotal > 0) {
      categoryBreakdown.push({
        name: "Other",
        amount: Math.round(otherTotal * 100) / 100,
        color: categoryColorVar("gray"),
      });
    }

    let cumulative = 0;
    const dailyCashFlow = Array.from(dailyTotals.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, { income: dayIncome, expense: dayExpense }]) => {
        cumulative += dayIncome - dayExpense;
        return {
          date,
          income: Math.round(dayIncome * 100) / 100,
          expense: Math.round(dayExpense * 100) / 100,
          cumulativeNet: Math.round(cumulative * 100) / 100,
        };
      });

    const net = income - expenses;
    const savingsRate = income > 0 ? Math.round((net / income) * 1000) / 10 : null;

    return NextResponse.json({
      month,
      hasData: transactions.length > 0,
      accountLabel: account ? `${account.name} (${maskIban(account.ibanLastFour, account.bankName)})` : "All accounts",
      totals: {
        income: Math.round(income * 100) / 100,
        expenses: Math.round(expenses * 100) / 100,
        net: Math.round(net * 100) / 100,
        savingsRate,
      },
      categoryBreakdown,
      dailyCashFlow,
      recentTransactions: transactions.slice(0, 6).map((t) => ({
        id: t.id,
        date: t.transactionDate,
        description: t.description,
        amount: t.amount,
        direction: t.direction,
        isTransfer: t.isTransfer,
        category: t.category?.name ?? null,
      })),
    });
  });
}
