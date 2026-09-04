import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { listAccountsForUser, resolveAccountScope } from "@/lib/db/accounts";
import type { TransactionRow } from "@/lib/db/types";
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

  const accounts = await listAccountsForUser(session.user.id);
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const scopeIds = resolveAccountScope(accounts, accountId);

  if (scopeIds.length === 0) {
    return NextResponse.json({ total: 0, page, pageSize, transactions: [] });
  }

  let query = supabase
    .from("transactions")
    .select("*", { count: "exact" })
    .in("account_id", scopeIds);

  if (q) query = query.ilike("description", `%${q}%`);
  if (dateFrom) query = query.gte("transaction_date", new Date(dateFrom).toISOString());
  if (dateTo) query = query.lte("transaction_date", new Date(dateTo).toISOString());

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order("transaction_date", { ascending: false })
    .range(from, to)
    .returns<TransactionRow[]>();
  if (error) throw error;

  return NextResponse.json({
    total: count ?? 0,
    page,
    pageSize,
    transactions: (data ?? []).map((t) => {
      const account = accountById.get(t.account_id);
      return {
        id: t.id,
        date: t.transaction_date,
        description: t.description,
        amount: t.amount,
        direction: t.direction,
        accountId: t.account_id,
        accountName: account?.name ?? "Unknown account",
        maskedAccountIban: account ? maskIban(account.ibanLastFour, account.bankName) : null,
        counterpartyIbanLastFour: t.counterparty_iban_last_four,
        isTransfer: t.is_transfer,
        isRecurring: t.is_recurring,
        tag: t.tag,
        notes: t.notes,
      };
    }),
  });
}
