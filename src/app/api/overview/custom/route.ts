import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { listAccountsForUser, resolveAccountScope } from "@/lib/db/accounts";
import type { TransactionRow } from "@/lib/db/types";
import { getSession } from "@/lib/auth/session";
import { assignChartColors, categoryColorVar } from "@/lib/categories";
import { dateKey, monthBounds, toMonthString } from "@/lib/date-range";
import {
  DIMENSIONS,
  DIMENSION_LABELS,
  DIRECTIONS,
  MEASURES,
  MEASURE_LABELS,
  TEMPORAL_DIMENSIONS,
  type CustomChartPoint,
  type Dimension,
  type Measure,
} from "@/lib/overview-types";

const MAX_CATEGORICAL_SLOTS = 7; // + one "Other" bucket for additive measures

type TransactionWithCategoryRow = TransactionRow & { category: { name: string } | null };

function parseEnum<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function groupKey(
  dimension: Dimension,
  tx: TransactionWithCategoryRow,
  accountNameById: Map<string, string>
): string {
  switch (dimension) {
    case "category":
      return tx.category?.name ?? "Uncategorized";
    case "merchant":
      return tx.description.trim().replace(/\s+/g, " ") || "(no description)";
    case "account":
      return accountNameById.get(tx.account_id) ?? "Unknown account";
    case "day":
      return dateKey(new Date(tx.transaction_date));
    case "week": {
      const weekIndex = Math.floor((new Date(tx.transaction_date).getUTCDate() - 1) / 7) + 1;
      return `Week ${weekIndex}`;
    }
  }
}

function measureLabel(measure: Measure): string {
  if (measure === "count") return "Number of transactions";
  return `${MEASURE_LABELS[measure]} (EUR)`;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const accountId = params.get("accountId");
  const dimension = parseEnum(params.get("dimension"), DIMENSIONS, "category");
  const measure = parseEnum(params.get("measure"), MEASURES, "total");
  const direction = parseEnum(params.get("direction"), DIRECTIONS, "expense");
  const isTemporal = (TEMPORAL_DIMENSIONS as string[]).includes(dimension);

  const empty = () =>
    NextResponse.json({
      dimension,
      measure,
      direction,
      isTemporal,
      xLabel: DIMENSION_LABELS[dimension],
      yLabel: measureLabel(measure),
      data: [] as CustomChartPoint[],
    });

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user;

  const accounts = await listAccountsForUser(user.id);
  const accountNameById = new Map(accounts.map((a) => [a.id, a.name]));
  const scopeIds = resolveAccountScope(accounts, accountId);
  if (scopeIds.length === 0) return empty();

  let month = params.get("month");
  if (!month) {
    const { data: latestRow } = await supabase
      .from("transactions")
      .select("transaction_date")
      .in("account_id", scopeIds)
      .order("transaction_date", { ascending: false })
      .limit(1)
      .maybeSingle<{ transaction_date: string }>();
    month = toMonthString(latestRow ? new Date(latestRow.transaction_date) : new Date());
  }
  const { start, end } = monthBounds(month);

  let query = supabase
    .from("transactions")
    .select("*, category:categories(name)")
    .in("account_id", scopeIds)
    .gte("transaction_date", start.toISOString())
    .lt("transaction_date", end.toISOString())
    .eq("is_transfer", false);

  if (direction !== "all") {
    query = query.eq("direction", direction === "income" ? "INCOME" : "EXPENSE");
  }

  const { data, error } = await query.returns<TransactionWithCategoryRow[]>();
  if (error) throw error;
  const transactions = data ?? [];

  if (transactions.length === 0) return empty();

  const groups = new Map<string, { sum: number; count: number; max: number }>();
  for (const tx of transactions) {
    const key = groupKey(dimension, tx, accountNameById);
    const amount = Number(tx.amount);
    const entry = groups.get(key) ?? { sum: 0, count: 0, max: 0 };
    entry.sum += amount;
    entry.count += 1;
    entry.max = Math.max(entry.max, amount);
    groups.set(key, entry);
  }

  function measureValue(entry: { sum: number; count: number; max: number }): number {
    switch (measure) {
      case "total":
        return entry.sum;
      case "average":
        return entry.sum / entry.count;
      case "count":
        return entry.count;
      case "largest":
        return entry.max;
    }
  }

  let data2: CustomChartPoint[];

  if (isTemporal) {
    data2 = Array.from(groups.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, entry]) => ({
        key,
        value: Math.round(measureValue(entry) * 100) / 100,
        color: categoryColorVar("blue"),
      }));
  } else {
    const ranked = Array.from(groups.entries())
      .map(([key, entry]) => [key, measureValue(entry), entry] as const)
      .sort((a, b) => b[1] - a[1]);

    const top = ranked.slice(0, MAX_CATEGORICAL_SLOTS);
    const rest = ranked.slice(MAX_CATEGORICAL_SLOTS);

    const colors = assignChartColors(top.map(([key]) => key));
    data2 = top.map(([key, value]) => ({
      key,
      value: Math.round(value * 100) / 100,
      color: colors.get(key) ?? categoryColorVar("gray"),
    }));

    // Non-additive measures (average, largest) can't be meaningfully summarized
    // into a single "Other" bucket, so we simply cap them to the top 7.
    if (rest.length > 0 && (measure === "total" || measure === "count")) {
      const otherValue = rest.reduce((sum, [, value]) => sum + value, 0);
      if (otherValue > 0) {
        data2.push({ key: "Other", value: Math.round(otherValue * 100) / 100, color: categoryColorVar("gray") });
      }
    }
  }

  return NextResponse.json({
    dimension,
    measure,
    direction,
    isTemporal,
    xLabel: DIMENSION_LABELS[dimension],
    yLabel: measureLabel(measure),
    data: data2,
  });
}
