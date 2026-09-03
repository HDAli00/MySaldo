import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { maskIban } from "@/lib/iban";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await db.account.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  const withStats = await Promise.all(
    accounts.map(async (account) => {
      const [transactionCount, latestTransaction] = await Promise.all([
        db.transaction.count({ where: { accountId: account.id } }),
        db.transaction.findFirst({
          where: { accountId: account.id },
          orderBy: { transactionDate: "desc" },
        }),
      ]);

      return {
        id: account.id,
        name: account.name,
        maskedIban: maskIban(account.ibanLastFour, account.bankName),
        bankName: account.bankName,
        accountType: account.accountType,
        latestBalance: account.latestBalance,
        latestTransactionDate: account.latestTransactionDate ?? latestTransaction?.transactionDate ?? null,
        transactionCount,
      };
    })
  );

  return NextResponse.json(withStats);
}
