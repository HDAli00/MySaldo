import { NextRequest, NextResponse } from "next/server";
import { Prisma, TransactionDirection } from "@prisma/client";
import { db } from "@/lib/db";
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

function parseEnum<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function groupKey(dimension: Dimension, tx: { description: string; transactionDate: Date; category: { name: string } | null; account: { name: string } }): string {
  switch (dimension) {
    case "category":
      return tx.category?.name ?? "Uncategorized";
    case "merchant":
      return tx.description.trim().replace(/\s+/g, " ") || "(no description)";
    case "account":
      return tx.account.name;
    case "day":
      return dateKey(tx.transactionDate);
    case "week": {
      const weekIndex = Math.floor((tx.transactionDate.getUTCDate() - 1) / 7) + 1;
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

  const user = await db.user.findFirst();
  if (!user) return empty();

  let month = params.get("month");
  if (!month) {
    const latest = await db.transaction.findFirst({
      where: { account: { userId: user.id }, ...(accountId ? { accountId } : {}) },
      orderBy: { transactionDate: "desc" },
    });
    month = toMonthString(latest?.transactionDate ?? new Date());
  }
  const { start, end } = monthBounds(month);

  const directionWhere: Prisma.TransactionWhereInput =
    direction === "all" ? {} : { direction: direction === "income" ? TransactionDirection.INCOME : TransactionDirection.EXPENSE };

  const transactions = await db.transaction.findMany({
    where: {
      account: { userId: user.id },
      transactionDate: { gte: start, lt: end },
      isTransfer: false,
      ...(accountId ? { accountId } : {}),
      ...directionWhere,
    },
    include: { category: true, account: true },
  });

  if (transactions.length === 0) return empty();

  const groups = new Map<string, { sum: number; count: number; max: number }>();
  for (const tx of transactions) {
    const key = groupKey(dimension, tx);
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

  let data: CustomChartPoint[];

  if (isTemporal) {
    data = Array.from(groups.entries())
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
    data = top.map(([key, value]) => ({
      key,
      value: Math.round(value * 100) / 100,
      color: colors.get(key) ?? categoryColorVar("gray"),
    }));

    // Non-additive measures (average, largest) can't be meaningfully summarized
    // into a single "Other" bucket, so we simply cap them to the top 7.
    if (rest.length > 0 && (measure === "total" || measure === "count")) {
      const otherValue = rest.reduce((sum, [, value]) => sum + value, 0);
      if (otherValue > 0) {
        data.push({ key: "Other", value: Math.round(otherValue * 100) / 100, color: categoryColorVar("gray") });
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
    data,
  });
}
