import { AccountScopeSelector } from "@/components/AccountScopeSelector";

export function Header({ email }: { email: string | null }) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Saldo
      </span>
      <div className="flex items-center gap-4">
        <AccountScopeSelector />
        {email && <span className="text-sm text-zinc-500 dark:text-zinc-400">{email}</span>}
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
