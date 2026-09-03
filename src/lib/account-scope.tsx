"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "saldo:account-scope";

/** "all" means the All Accounts scope; otherwise it's an Account.id. */
type AccountScopeContextValue = {
  accountId: string | "all";
  setAccountId: (id: string | "all") => void;
};

const AccountScopeContext = createContext<AccountScopeContextValue | null>(null);

export function AccountScopeProvider({ children }: { children: React.ReactNode }) {
  const [accountId, setAccountIdState] = useState<string | "all">("all");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from localStorage on mount
    if (stored) setAccountIdState(stored);
  }, []);

  const setAccountId = (id: string | "all") => {
    setAccountIdState(id);
    window.localStorage.setItem(STORAGE_KEY, id);
  };

  const value = useMemo(() => ({ accountId, setAccountId }), [accountId]);

  return <AccountScopeContext.Provider value={value}>{children}</AccountScopeContext.Provider>;
}

export function useAccountScope() {
  const ctx = useContext(AccountScopeContext);
  if (!ctx) throw new Error("useAccountScope must be used within an AccountScopeProvider");
  return ctx;
}
