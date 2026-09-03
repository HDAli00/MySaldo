import { AccountScopeSelector } from "@/components/AccountScopeSelector";

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Saldo
      </span>
      <AccountScopeSelector />
    </header>
  );
}
