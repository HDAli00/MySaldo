import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { listAccountsForUser, resolveAccountScope } from "@/lib/db/accounts";
import type { TransactionRow } from "@/lib/db/types";
import { maskIban } from "@/lib/iban";
import { assignChartColors, categoryColorVar } from "@/lib/categories";
import { dateKey, monthBounds, toMonthString } from "@/lib/date-range";
import { getSession } from "@/lib/auth/session";

const MAX_CATEGORY_SLOTS = 7; // + one "Other" bucket, per the dataviz 8-series cap

type TransactionWithCategoryRow = TransactionRow & { category: { name: string } | null };

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const accountId = params.get("accountId");

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user;

  const accounts = await listAccountsForUser(user.id);
  const scopeIds = resolveAccountScope(accounts, accountId);
  const account = accountId ? (accounts.find((a) => a.id === accountId) ?? null) : null;

  let month = params.get("month");
  if (!month) {
    let latestDate: Date | null = null;
    if (scopeIds.length > 0) {
      const { data: latestRow } = await supabase
        .from("transactions")
        .select("transaction_date")
        .in("account_id", scopeIds)
        .order("transaction_date", { ascending: false })
        .limit(1)
        .maybeSingle<{ transaction_date: string }>();
      latestDate = latestRow ? new Date(latestRow.transaction_date) : null;
    }
    month = toMonthString(latestDate ?? new Date());
  }
  const { start, end } = monthBounds(month);

  let transactions: TransactionWithCategoryRow[] = [];
  if (scopeIds.length > 0) {
    const { data, error } = await supabase
      .from("transactions")
      .select("*, category:categories(name)")
      .in("account_id", scopeIds)
      .gte("transaction_date", start.toISOString())
      .lt("transaction_date", end.toISOString())
      .order("transaction_date", { ascending: false })
      .returns<TransactionWithCategoryRow[]>();
    if (error) throw error;
    transactions = data ?? [];
  }

  let income = 0;
  let expenses = 0;
  const categoryTotals = new Map<string, number>();
  const dailyTotals = new Map<string, { income: number; expense: number }>();

  for (const tx of transactions) {
    const amount = Number(tx.amount);
    const transactionDate = new Date(tx.transaction_date);
    const day = dateKey(transactionDate);
    const dayEntry = dailyTotals.get(day) ?? { income: 0, expense: 0 };

    if (tx.is_transfer) {
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
      date: tx.transaction_date,
      description: tx.description,
      amount: tx.amount,
      direction: tx.direction,
      isTransfer: tx.is_transfer,
      category: tx.category?.name ?? null,
    })),
  });
}
