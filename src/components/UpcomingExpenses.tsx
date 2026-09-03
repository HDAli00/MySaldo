"use client";

import { useEffect, useState } from "react";
import { useAccountScope } from "@/lib/account-scope";

interface UpcomingItem {
  description: string;
  category: string | null;
  expectedAmount: number;
  expectedDate: string;
  occurrences: number;
}

interface UpcomingResponse {
  targetMonth: string;
  items: UpcomingItem[];
  totalExpected: number;
}

const currencyFormatter = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

function monthLabel(month: string): string {
  const [year, monthNum] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNum - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function dayLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function UpcomingExpenses({ month }: { month: string }) {
  const { accountId } = useAccountScope();
  const [data, setData] = useState<UpcomingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!month) return;
    const params = new URLSearchParams({ month });
    if (accountId !== "all") params.set("accountId", accountId);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- kick off loading state for the fetch below
    setLoading(true);
    fetch(`/api/overview/upcoming?${params.toString()}`)
      .then((res) => res.json())
      .then((json: UpcomingResponse) => setData(json))
      .finally(() => setLoading(false));
  }, [month, accountId]);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Upcoming fixed expenses
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {data ? monthLabel(data.targetMonth) : loading ? "Loading…" : ""} · based on recurring
            payments detected in recent months
          </p>
        </div>
        {data && data.items.length > 0 && (
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {currencyFormatter.format(data.totalExpected)}
          </span>
        )}
      </div>

      {data && data.items.length === 0 && !loading && (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          No recurring expenses detected yet — Saldo needs at least two similar-amount charges
          from the same merchant in different months to project one forward.
        </p>
      )}

      {data && data.items.length > 0 && (
        <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
          {data.items.map((item) => (
            <li key={item.description} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p className="text-zinc-900 dark:text-zinc-100">{item.description}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Expected {dayLabel(item.expectedDate)}
                  {item.category ? ` · ${item.category}` : ""}
                </p>
              </div>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {currencyFormatter.format(item.expectedAmount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
