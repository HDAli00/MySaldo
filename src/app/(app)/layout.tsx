import { redirect } from "next/navigation";
import { AccountScopeProvider } from "@/lib/account-scope";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { getCurrentAppUser } from "@/lib/require-user";

// Proxy already redirects unauthenticated requests to /login (see
// src/proxy.ts); this check runs the query close to the data it protects
// too, per Next.js's own guidance not to rely on Proxy as the only line of
// defense for authorization.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentAppUser();
  if (!user) redirect("/login");

  return (
    <AccountScopeProvider>
      <div className="flex min-h-screen flex-col">
        <Header email={user.email} />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 bg-zinc-50 p-6 dark:bg-black">{children}</main>
        </div>
      </div>
    </AccountScopeProvider>
  );
}
