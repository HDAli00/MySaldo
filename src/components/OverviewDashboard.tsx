"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccountScope } from "@/lib/account-scope";
import { StatTile } from "@/components/StatTile";
import { CategoryBarChart, CumulativeNetChart, IncomeExpenseChart } from "@/components/OverviewCharts";
import { ConfigurableChartCard } from "@/components/ConfigurableChartCard";
import { UpcomingExpenses } from "@/components/UpcomingExpenses";

interface OverviewResponse {
  month: string;
  hasData: boolean;
  accountLabel: string;
  totals: { income: number; expenses: number; net: number; savingsRate: number | null };
  categoryBreakdown: { name: string; amount: number; color: string }[];
  dailyCashFlow: { date: string; income: number; expense: number; cumulativeNet: number }[];
  recentTransactions: {
    id: string;
    date: string;
    description: string;
    amount: string;
    direction: "INCOME" | "EXPENSE";
    isTransfer: boolean;
    category: string | null;
  }[];
}

const currencyFormatter = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function OverviewDashboard() {
  const { accountId } = useAccountScope();
  const [month, setMonth] = useState<string>("");
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    if (accountId !== "all") params.set("accountId", accountId);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- kick off loading state for the fetch below
    setLoading(true);
    fetch(`/api/overview?${params.toString()}`)
      .then((res) => res.json())
      .then((json: OverviewResponse) => {
        setData(json);
        if (!month) setMonth(json.month);
      })
      .finally(() => setLoading(false));
  }, [month, accountId]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Overview</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {data ? data.accountLabel : "Loading…"}
          </p>
        </div>
        <input
          type="month"
          value={month || currentMonth()}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          aria-label="Select month"
        />
      </div>

      {!loading && data && !data.hasData && (
        <div className="mt-6 rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
          No transactions for this month yet.{" "}
          <Link href="/imports" className="font-medium text-zinc-900 underline dark:text-zinc-100">
            Import a CSV
          </Link>{" "}
          to see your dashboard.
        </div>
      )}

      {data && data.hasData && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile label="Income" value={currencyFormatter.format(data.totals.income)} tone="positive" />
            <StatTile label="Expenses" value={currencyFormatter.format(data.totals.expenses)} tone="negative" />
            <StatTile
              label="Net cash flow"
              value={currencyFormatter.format(data.totals.net)}
              tone={data.totals.net >= 0 ? "positive" : "negative"}
            />
            <StatTile
              label="Savings rate"
              value={data.totals.savingsRate !== null ? `${data.totals.savingsRate}%` : "—"}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-3">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Spending by category
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Transfers between your own accounts are excluded.
              </p>
              <div className="mt-3">
                <CategoryBarChart data={data.categoryBreakdown} />
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Categories</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {data.categoryBreakdown.map((c) => (
                  <li key={c.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.name}
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      {currencyFormatter.format(c.amount)}
                    </span>
                  </li>
                ))}
                {data.categoryBreakdown.length === 0 && (
                  <li className="text-sm text-zinc-500 dark:text-zinc-400">No expenses this month.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Income vs. expense
              </h2>
              <div className="mt-3">
                <IncomeExpenseChart data={data.dailyCashFlow} />
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Cumulative cash flow this month
              </h2>
              <div className="mt-3">
                <CumulativeNetChart data={data.dailyCashFlow} />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <ConfigurableChartCard month={data.month} />
          </div>

          <div className="mt-6">
            <UpcomingExpenses month={data.month} />
          </div>

          <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Recent transactions
              </h2>
              <Link
                href="/transactions"
                className="text-sm font-medium text-zinc-600 underline dark:text-zinc-400"
              >
                View all
              </Link>
            </div>
            <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.recentTransactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="text-zinc-900 dark:text-zinc-100">{t.description}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {t.date.slice(0, 10)} · {t.isTransfer ? "Transfer" : t.category ?? "Uncategorized"}
                    </p>
                  </div>
                  <span
                    className={`font-medium ${
                      t.direction === "INCOME"
                        ? "text-green-700 dark:text-green-400"
                        : "text-zinc-900 dark:text-zinc-100"
                    }`}
                  >
                    {t.direction === "INCOME" ? "+" : "-"}
                    {currencyFormatter.format(Number(t.amount))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
