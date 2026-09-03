import { NextResponse } from "next/server";
import { maskIban } from "@/lib/iban";
import { getCurrentAppUser } from "@/lib/require-user";
import { withUserScope } from "@/lib/user-scope";

export async function GET() {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return withUserScope(user.id, async (tx) => {
    const accounts = await tx.account.findMany({
      orderBy: { createdAt: "asc" },
    });

    const withStats = await Promise.all(
      accounts.map(async (account) => {
        const [transactionCount, latestTransaction] = await Promise.all([
          tx.transaction.count({ where: { accountId: account.id } }),
          tx.transaction.findFirst({
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
  });
}
