import { NextRequest, NextResponse } from "next/server";
import { detectUpcomingFixedExpenses } from "@/lib/recurring";
import { toMonthString } from "@/lib/date-range";
import { getSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const accountId = params.get("accountId");
  const month = params.get("month");

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolvedMonth = month ?? toMonthString(new Date());
  const { targetMonth, items } = await detectUpcomingFixedExpenses(session.user.id, resolvedMonth, accountId);

  const totalExpected = Math.round(items.reduce((sum, item) => sum + item.expectedAmount, 0) * 100) / 100;

  return NextResponse.json({ targetMonth, items, totalExpected });
}
