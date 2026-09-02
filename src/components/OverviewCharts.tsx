"use client";

import {
  Area,
  AreaChart,
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
import type { ChartType, CustomChartPoint } from "@/lib/overview-types";

const currencyFormatter = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const compactCurrencyFormatter = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});
const countFormatter = new Intl.NumberFormat("nl-NL");

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

/**
 * User-configurable chart: any dimension/measure combination from
 * /api/overview/custom, rendered as a bar, line, or area chart.
 *
 * Bar charts keep per-category identity (each bar can carry its own
 * categorical color, capped at 8 slots upstream). Line and area charts are
 * a single connected series describing one metric across the x-axis, so
 * they always use one stroke color — varying color along a connected line
 * would misrepresent it as several series.
 */
export function ConfigurableSeriesChart({
  data,
  chartType,
  isCount,
}: {
  data: CustomChartPoint[];
  chartType: ChartType;
  isCount: boolean;
}) {
  if (data.length === 0) {
    return <EmptyChart message="No matching transactions for this configuration." />;
  }

  const valueFormatter = (v: number) => (isCount ? countFormatter.format(v) : compactCurrencyFormatter.format(v));
  const tooltipFormatter = (value: unknown) => {
    const n = Number(value);
    return isCount ? countFormatter.format(n) : currencyFormatter.format(n);
  };
  const seriesColor = data[0]?.color ?? categoryColorVarFallback();

  const rotateLabels = data.length > 6;

  if (chartType === "bar") {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: rotateLabels ? 48 : 8, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="0" />
          <XAxis
            dataKey="key"
            tick={axisTick}
            axisLine={{ stroke: "var(--chart-axis)" }}
            tickLine={false}
            angle={rotateLabels ? -35 : 0}
            textAnchor={rotateLabels ? "end" : "middle"}
            height={rotateLabels ? 56 : 24}
            interval={0}
            padding={{ left: 16, right: 16 }}
          />
          <YAxis
            tick={axisTick}
            axisLine={{ stroke: "var(--chart-axis)" }}
            tickLine={false}
            tickFormatter={valueFormatter}
            width={56}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={tooltipFormatter}
            cursor={{ fill: "var(--chart-grid)", opacity: 0.4 }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {data.map((entry) => (
              <Cell key={entry.key} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const ChartComponent = chartType === "area" ? AreaChart : LineChart;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ChartComponent data={data} margin={{ top: 8, right: 16, bottom: rotateLabels ? 48 : 8, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="0" />
        <XAxis
          dataKey="key"
          tick={axisTick}
          axisLine={{ stroke: "var(--chart-axis)" }}
          tickLine={false}
          angle={rotateLabels ? -35 : 0}
          textAnchor={rotateLabels ? "end" : "middle"}
          height={rotateLabels ? 56 : 24}
          interval={0}
          padding={{ left: 16, right: 16 }}
        />
        <YAxis
          tick={axisTick}
          axisLine={{ stroke: "var(--chart-axis)" }}
          tickLine={false}
          tickFormatter={valueFormatter}
          width={56}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={tooltipFormatter} />
        {chartType === "area" ? (
          <Area
            type="monotone"
            dataKey="value"
            stroke={seriesColor}
            strokeWidth={2}
            fill={seriesColor}
            fillOpacity={0.1}
            dot={{ r: 3, strokeWidth: 2, stroke: "var(--chart-surface)", fill: seriesColor }}
          />
        ) : (
          <Line
            type="monotone"
            dataKey="value"
            stroke={seriesColor}
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 2, stroke: "var(--chart-surface)", fill: seriesColor }}
            activeDot={{ r: 5 }}
          />
        )}
      </ChartComponent>
    </ResponsiveContainer>
  );
}

function categoryColorVarFallback(): string {
  return "var(--series-blue)";
}
