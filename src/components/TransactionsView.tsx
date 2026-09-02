"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccountScope } from "@/lib/account-scope";

interface AccountOption {
  id: string;
  name: string;
  maskedIban: string;
}

interface TransactionRow {
  id: string;
  date: string;
  description: string;
  amount: string;
  direction: "INCOME" | "EXPENSE";
  accountName: string;
  maskedAccountIban: string;
  counterpartyIbanLastFour: string | null;
  isTransfer: boolean;
  isRecurring: boolean;
  tag: string | null;
}

const currencyFormatter = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

export function TransactionsView() {
  const searchParams = useSearchParams();
  const { accountId: scopeAccountId } = useAccountScope();

  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [accountFilter, setAccountFilter] = useState<string>(
    searchParams.get("accountId") ?? "all"
  );
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => res.json())
      .then((data: AccountOption[]) => setAccounts(data))
      .catch(() => setAccounts([]));
  }, []);

  // Default the in-page account filter to the global account scope, unless a
  // specific accountId was passed in via the URL (e.g. from the Accounts page).
  useEffect(() => {
    if (!searchParams.get("accountId")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync in-page filter from global account scope
      setAccountFilter(scopeAccountId);
    }
  }, [scopeAccountId, searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (accountFilter !== "all") params.set("accountId", accountFilter);
    if (query) params.set("q", query);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- kick off loading state for the fetch below
    setLoading(true);
    fetch(`/api/transactions?${params.toString()}`)
      .then((res) => res.json())
      .then((data: { total: number; transactions: TransactionRow[] }) => {
        setTransactions(data.transactions);
        setTotal(data.total);
      })
      .catch(() => {
        setTransactions([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [accountFilter, query, dateFrom, dateTo]);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <select
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="all">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {a.maskedIban}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Search description…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <span className="self-center text-sm text-zinc-500">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
        {loading ? "Loading…" : `${total} transaction${total === 1 ? "" : "s"}`}
      </p>

      <div className="mt-2 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium">Account</th>
              <th className="px-3 py-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {transactions.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-zinc-500">
                  No transactions match these filters.
                </td>
              </tr>
            )}
            {transactions.map((t) => (
              <tr key={t.id}>
                <td className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-400">
                  {t.date.slice(0, 10)}
                </td>
                <td className="px-3 py-2 text-zinc-900 dark:text-zinc-100">
                  {t.description}
                  {t.isTransfer && (
                    <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      Transfer
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-400">
                  {t.maskedAccountIban}
                </td>
                <td
                  className={`whitespace-nowrap px-3 py-2 text-right font-medium ${
                    t.direction === "INCOME"
                      ? "text-green-700 dark:text-green-400"
                      : "text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  {t.direction === "INCOME" ? "+" : "-"}
                  {currencyFormatter.format(Number(t.amount))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
