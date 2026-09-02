"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const currencyFormatter = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const compactCurrencyFormatter = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const tooltipStyle = {
  background: "var(--chart-surface)",
  border: "1px solid var(--chart-grid)",
  borderRadius: 8,
  color: "var(--chart-ink-primary)",
  fontSize: 13,
};
const axisTick = { fill: "var(--chart-ink-muted)", fontSize: 12 };

export interface CategorySpend {
  name: string;
  amount: number;
  color: string;
}

/** Horizontal bar chart of spending by category (top 7 + "Other"), one axis, capped at 8 bars. */
export function CategoryBarChart({ data }: { data: CategorySpend[] }) {
  if (data.length === 0) {
    return <EmptyChart message="No categorized expenses yet this month." />;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 40)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
        barCategoryGap={10}
      >
        <CartesianGrid horizontal={false} stroke="var(--chart-grid)" strokeDasharray="0" />
        <XAxis
          type="number"
          tick={axisTick}
          tickFormatter={(v) => compactCurrencyFormatter.format(v)}
          axisLine={{ stroke: "var(--chart-axis)" }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={axisTick}
          axisLine={{ stroke: "var(--chart-axis)" }}
          tickLine={false}
          width={110}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => currencyFormatter.format(Number(value))}
          cursor={{ fill: "var(--chart-grid)", opacity: 0.4 }}
        />
        <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={24}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface DailyFlow {
  date: string;
  income: number;
  expense: number;
}

/** Two-series line chart: income vs. expense per day. Single shared EUR axis. */
export function IncomeExpenseChart({ data }: { data: DailyFlow[] }) {
  if (data.length === 0) {
    return <EmptyChart message="No transactions yet this month." />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="0" />
        <XAxis
          dataKey="date"
          tick={axisTick}
          axisLine={{ stroke: "var(--chart-axis)" }}
          tickLine={false}
          tickFormatter={(d: string) => d.slice(8, 10)}
          minTickGap={16}
        />
        <YAxis
          tick={axisTick}
          axisLine={{ stroke: "var(--chart-axis)" }}
          tickLine={false}
          tickFormatter={(v) => compactCurrencyFormatter.format(v)}
          width={56}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => currencyFormatter.format(Number(value))}
        />
        <Legend wrapperStyle={{ color: "var(--chart-ink-secondary)", fontSize: 13 }} />
        <Line
          type="monotone"
          dataKey="income"
          name="Income"
          stroke="var(--series-blue)"
          strokeWidth={2}
          dot={{ r: 3, strokeWidth: 2, stroke: "var(--chart-surface)", fill: "var(--series-blue)" }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="expense"
          name="Expense"
          stroke="var(--series-orange)"
          strokeWidth={2}
          dot={{ r: 3, strokeWidth: 2, stroke: "var(--chart-surface)", fill: "var(--series-orange)" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export interface CumulativePoint {
  date: string;
  cumulativeNet: number;
}

/** Single-series line chart: cumulative net cash flow across the month. No legend needed (one series). */
export function CumulativeNetChart({ data }: { data: CumulativePoint[] }) {
  if (data.length === 0) {
    return <EmptyChart message="No transactions yet this month." />;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="0" />
        <XAxis
          dataKey="date"
          tick={axisTick}
          axisLine={{ stroke: "var(--chart-axis)" }}
          tickLine={false}
          tickFormatter={(d: string) => d.slice(8, 10)}
          minTickGap={16}
        />
        <YAxis
          tick={axisTick}
          axisLine={{ stroke: "var(--chart-axis)" }}
          tickLine={false}
          tickFormatter={(v) => compactCurrencyFormatter.format(v)}
          width={56}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => currencyFormatter.format(Number(value))}
        />
        <Line
          type="monotone"
          dataKey="cumulativeNet"
          name="Cumulative net cash flow"
          stroke="var(--series-blue)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--chart-surface)", fill: "var(--series-blue)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
      {message}
    </div>
  );
}
