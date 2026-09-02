"use client";

import { useEffect, useState } from "react";
import { useAccountScope } from "@/lib/account-scope";

interface AccountOption {
  id: string;
  name: string;
  maskedIban: string;
}

export function AccountScopeSelector() {
  const { accountId, setAccountId } = useAccountScope();
  const [accounts, setAccounts] = useState<AccountOption[]>([]);

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => res.json())
      .then((data: AccountOption[]) => setAccounts(data))
      .catch(() => setAccounts([]));
  }, []);

  return (
    <select
      value={accountId}
      onChange={(e) => setAccountId(e.target.value)}
      className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      aria-label="Account scope"
    >
      <option value="all">All accounts</option>
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.name} · {account.maskedIban}
        </option>
      ))}
    </select>
  );
}
