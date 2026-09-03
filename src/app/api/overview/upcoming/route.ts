import { NextRequest, NextResponse } from "next/server";
import { detectUpcomingFixedExpenses } from "@/lib/recurring";
import { toMonthString } from "@/lib/date-range";
import { getCurrentAppUser } from "@/lib/require-user";
import { withUserScope } from "@/lib/user-scope";

export async function GET(request: NextRequest) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const accountId = params.get("accountId");
  const month = params.get("month");
  const resolvedMonth = month ?? toMonthString(new Date());

  return withUserScope(user.id, async (tx) => {
    const { targetMonth, items } = await detectUpcomingFixedExpenses(tx, user.id, resolvedMonth, accountId);
    const totalExpected = Math.round(items.reduce((sum, item) => sum + item.expectedAmount, 0) * 100) / 100;
    return NextResponse.json({ targetMonth, items, totalExpected });
  });
}
