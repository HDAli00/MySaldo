import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { maskIban } from "@/lib/iban";
import { assignChartColors, categoryColorVar } from "@/lib/categories";

const MAX_CATEGORY_SLOTS = 7; // + one "Other" bucket, per the dataviz 8-series cap

function monthBounds(month: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));
  return { start, end };
}

function toMonthString(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const accountId = params.get("accountId");

  const user = await db.user.findFirst();
  if (!user) {
    return NextResponse.json({
      month: params.get("month") ?? toMonthString(new Date()),
      hasData: false,
      accountLabel: "All accounts",
      totals: { income: 0, expenses: 0, net: 0, savingsRate: null },
      categoryBreakdown: [],
      dailyCashFlow: [],
      recentTransactions: [],
    });
  }

  let month = params.get("month");
  if (!month) {
    const latest = await db.transaction.findFirst({
      where: { account: { userId: user.id }, ...(accountId ? { accountId } : {}) },
      orderBy: { transactionDate: "desc" },
    });
    month = toMonthString(latest?.transactionDate ?? new Date());
  }
  const { start, end } = monthBounds(month);

  const where: Prisma.TransactionWhereInput = {
    account: { userId: user.id },
    transactionDate: { gte: start, lt: end },
    ...(accountId ? { accountId } : {}),
  };

  const [transactions, account] = await Promise.all([
    db.transaction.findMany({
      where,
      include: { category: true, account: true },
      orderBy: { transactionDate: "desc" },
    }),
    accountId ? db.account.findUnique({ where: { id: accountId } }) : null,
  ]);

  let income = 0;
  let expenses = 0;
  const categoryTotals = new Map<string, number>();
  const dailyTotals = new Map<string, { income: number; expense: number }>();

  for (const tx of transactions) {
    const amount = Number(tx.amount);
    const day = dateKey(tx.transactionDate);
    const dayEntry = dailyTotals.get(day) ?? { income: 0, expense: 0 };

    if (tx.isTransfer) {
      // Transfers between the user's own accounts are excluded from income/expense
      // and from the category breakdown entirely — they are not spending.
      dailyTotals.set(day, dayEntry);
      continue;
    }

    if (tx.direction === "INCOME") {
      income += amount;
      dayEntry.income += amount;
    } else {
      expenses += amount;
      dayEntry.expense += amount;
      const categoryName = tx.category?.name ?? "Uncategorized";
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
    recentTransactions: transactions.slice(0, 6).map((tx) => ({
      id: tx.id,
      date: tx.transactionDate,
      description: tx.description,
      amount: tx.amount,
      direction: tx.direction,
      isTransfer: tx.isTransfer,
      category: tx.category?.name ?? null,
    })),
  });
}
