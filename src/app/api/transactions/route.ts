import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { maskIban } from "@/lib/iban";
import { getSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const accountId = params.get("accountId");
  const q = params.get("q")?.trim();
  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");
  const page = Math.max(1, Number(params.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(params.get("pageSize") ?? "50")));

  const where: Prisma.TransactionWhereInput = { account: { userId: session.user.id } };
  if (accountId) where.accountId = accountId;
  if (q) where.description = { contains: q, mode: "insensitive" };
  if (dateFrom || dateTo) {
    where.transactionDate = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  const [transactions, total] = await Promise.all([
    db.transaction.findMany({
      where,
      include: { account: true },
      orderBy: { transactionDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.transaction.count({ where }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize,
    transactions: transactions.map((t) => ({
      id: t.id,
      date: t.transactionDate,
      description: t.description,
      amount: t.amount,
      direction: t.direction,
      accountId: t.accountId,
      accountName: t.account.name,
      maskedAccountIban: maskIban(t.account.ibanLastFour, t.account.bankName),
      counterpartyIbanLastFour: t.counterpartyIbanLastFour,
      isTransfer: t.isTransfer,
      isRecurring: t.isRecurring,
      tag: t.tag,
      notes: t.notes,
    })),
  });
}
