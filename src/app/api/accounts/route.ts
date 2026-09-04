import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { listAccountsForUser } from "@/lib/db/accounts";
import { maskIban } from "@/lib/iban";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = (await listAccountsForUser(session.user.id)).sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  const withStats = await Promise.all(
    accounts.map(async (account) => {
      const [{ count: transactionCount }, { data: latestTransaction }] = await Promise.all([
        supabase.from("transactions").select("*", { count: "exact", head: true }).eq("account_id", account.id),
        supabase
          .from("transactions")
          .select("transaction_date")
          .eq("account_id", account.id)
          .order("transaction_date", { ascending: false })
          .limit(1)
          .maybeSingle<{ transaction_date: string }>(),
      ]);

      return {
        id: account.id,
        name: account.name,
        maskedIban: maskIban(account.ibanLastFour, account.bankName),
        bankName: account.bankName,
        accountType: account.accountType,
        latestBalance: account.latestBalance,
        latestTransactionDate:
          account.latestTransactionDate?.toISOString() ?? latestTransaction?.transaction_date ?? null,
        transactionCount: transactionCount ?? 0,
      };
    })
  );

  return NextResponse.json(withStats);
}
