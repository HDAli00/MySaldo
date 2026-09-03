import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { detectUpcomingFixedExpenses } from "@/lib/recurring";
import { nextMonthString, toMonthString } from "@/lib/date-range";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const accountId = params.get("accountId");
  const month = params.get("month");

  const user = await db.user.findFirst();
  if (!user) {
    return NextResponse.json({
      targetMonth: month ? nextMonthString(month) : toMonthString(new Date()),
      items: [],
      totalExpected: 0,
    });
  }

  const resolvedMonth = month ?? toMonthString(new Date());
  const { targetMonth, items } = await detectUpcomingFixedExpenses(user.id, resolvedMonth, accountId);

  const totalExpected = Math.round(items.reduce((sum, item) => sum + item.expectedAmount, 0) * 100) / 100;

  return NextResponse.json({ targetMonth, items, totalExpected });
}
