import { AccountScopeProvider } from "@/lib/account-scope";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { requireUser } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <AccountScopeProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 bg-zinc-50 p-6 dark:bg-black">{children}</main>
        </div>
      </div>
    </AccountScopeProvider>
  );
}
