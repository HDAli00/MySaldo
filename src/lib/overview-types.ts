export const DIMENSIONS = ["category", "merchant", "account", "day", "week"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const MEASURES = ["total", "average", "count", "largest"] as const;
export type Measure = (typeof MEASURES)[number];

export const DIRECTIONS = ["expense", "income", "all"] as const;
export type DirectionFilter = (typeof DIRECTIONS)[number];

export const CHART_TYPES = ["bar", "line", "area"] as const;
export type ChartType = (typeof CHART_TYPES)[number];

export const DIMENSION_LABELS: Record<Dimension, string> = {
  category: "Category",
  merchant: "Merchant / description",
  account: "Account",
  day: "Day",
  week: "Week",
};

export const MEASURE_LABELS: Record<Measure, string> = {
  total: "Total amount",
  average: "Average amount",
  count: "Transaction count",
  largest: "Largest transaction",
};

export const DIRECTION_LABELS: Record<DirectionFilter, string> = {
  expense: "Expenses",
  income: "Income",
  all: "Income + expenses",
};

export const CHART_TYPE_LABELS: Record<ChartType, string> = {
  bar: "Bar",
  line: "Line",
  area: "Area",
};

export const TEMPORAL_DIMENSIONS: Dimension[] = ["day", "week"];

export interface CustomChartPoint {
  key: string;
  value: number;
  color: string;
}

export interface CustomChartResponse {
  dimension: Dimension;
  measure: Measure;
  direction: DirectionFilter;
  isTemporal: boolean;
  xLabel: string;
  yLabel: string;
  data: CustomChartPoint[];
}
