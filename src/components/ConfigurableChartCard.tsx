"use client";

import { useEffect, useState } from "react";
import { useAccountScope } from "@/lib/account-scope";
import { ConfigurableSeriesChart } from "@/components/OverviewCharts";
import {
  CHART_TYPES,
  CHART_TYPE_LABELS,
  DIMENSIONS,
  DIMENSION_LABELS,
  DIRECTIONS,
  DIRECTION_LABELS,
  MEASURES,
  MEASURE_LABELS,
  type ChartType,
  type CustomChartResponse,
  type Dimension,
  type DirectionFilter,
  type Measure,
} from "@/lib/overview-types";

const selectClass =
  "rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function ConfigurableChartCard({ month }: { month: string }) {
  const { accountId } = useAccountScope();

  const [chartType, setChartType] = useState<ChartType>("bar");
  const [dimension, setDimension] = useState<Dimension>("category");
  const [measure, setMeasure] = useState<Measure>("total");
  const [direction, setDirection] = useState<DirectionFilter>("expense");
  const [data, setData] = useState<CustomChartResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!month) return;
    const params = new URLSearchParams({ month, dimension, measure, direction });
    if (accountId !== "all") params.set("accountId", accountId);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- kick off loading state for the fetch below
    setLoading(true);
    fetch(`/api/overview/custom?${params.toString()}`)
      .then((res) => res.json())
      .then((json: CustomChartResponse) => setData(json))
      .finally(() => setLoading(false));
  }, [month, accountId, dimension, measure, direction]);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Custom chart</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Build your own view: choose what goes on each axis and how it&apos;s aggregated.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Field label="Chart">
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as ChartType)}
            className={selectClass}
          >
            {CHART_TYPES.map((t) => (
              <option key={t} value={t}>
                {CHART_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="X-axis">
          <select
            value={dimension}
            onChange={(e) => setDimension(e.target.value as Dimension)}
            className={selectClass}
          >
            {DIMENSIONS.map((d) => (
              <option key={d} value={d}>
                {DIMENSION_LABELS[d]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Y-axis">
          <select
            value={measure}
            onChange={(e) => setMeasure(e.target.value as Measure)}
            className={selectClass}
          >
            {MEASURES.map((m) => (
              <option key={m} value={m}>
                {MEASURE_LABELS[m]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Show">
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as DirectionFilter)}
            className={selectClass}
          >
            {DIRECTIONS.map((d) => (
              <option key={d} value={d}>
                {DIRECTION_LABELS[d]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        {data ? `${data.xLabel} vs. ${data.yLabel}` : loading ? "Loading…" : ""}
      </p>

      <div className="mt-2">
        {data && <ConfigurableSeriesChart data={data.data} chartType={chartType} isCount={measure === "count"} />}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
      {label}
      {children}
    </label>
  );
}
