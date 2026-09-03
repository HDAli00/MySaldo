import { AccountScopeSelector } from "@/components/AccountScopeSelector";
import { logout } from "@/app/actions/auth";
import { getSession } from "@/lib/auth/session";

export async function Header() {
  const session = await getSession();

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Saldo
      </span>
      <div className="flex items-center gap-4">
        <AccountScopeSelector />
        {session && (
          <form action={logout} className="flex items-center gap-3">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">{session.user.email}</span>
            <button
              type="submit"
              className="text-sm font-medium text-zinc-700 underline hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              Sign out
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
