import Link from "next/link";
import { supabase } from "@/lib/db";
import { listAccountsForUser } from "@/lib/db/accounts";
import { maskIban } from "@/lib/iban";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

async function getAccounts(userId: string) {
  const accounts = (await listAccountsForUser(userId)).sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );
  return Promise.all(
    accounts.map(async (account) => {
      const { count: transactionCount } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("account_id", account.id);
      return {
        id: account.id,
        name: account.name,
        maskedIban: maskIban(account.ibanLastFour, account.bankName),
        bankName: account.bankName,
        latestBalance: account.latestBalance,
        latestTransactionDate: account.latestTransactionDate,
        transactionCount: transactionCount ?? 0,
      };
    })
  );
}

export default async function AccountsPage() {
  const user = await requireUser();
  const accounts = await getAccounts(user.id);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Accounts</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Accounts are detected automatically from the IBAN in each imported CSV.
      </p>

      {accounts.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
          No accounts yet.{" "}
          <Link href="/imports" className="font-medium text-zinc-900 underline dark:text-zinc-100">
            Import a CSV
          </Link>{" "}
          to get started.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {accounts.map((account) => (
            <Link
              key={account.id}
              href={`/transactions?accountId=${account.id}`}
              className="rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-zinc-900 dark:text-zinc-50">{account.name}</h2>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{account.bankName}</span>
              </div>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{account.maskedIban}</p>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Latest balance</p>
                  <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {account.latestBalance !== null
                      ? new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(
                          Number(account.latestBalance)
                        )
                      : "—"}
                  </p>
                </div>
                <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
                  <p>{account.transactionCount} transactions</p>
                  {account.latestTransactionDate && (
                    <p>as of {account.latestTransactionDate.toISOString().slice(0, 10)}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
