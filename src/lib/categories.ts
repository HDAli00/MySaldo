/**
 * Default categories (PROJECT_PLAN.md section 5.4) and their chart identity.
 *
 * Colors are assigned from the dataviz skill's validated categorical palette
 * in a fixed order (see src/app/globals.css --series-*). Frequently co-occurring
 * expense categories get distinct slots; rarer ones may share a hue with a
 * category unlikely to appear in the same top-8 spending chart at once.
 */

export type CategorySlot =
  | "blue"
  | "orange"
  | "aqua"
  | "yellow"
  | "magenta"
  | "green"
  | "violet"
  | "red"
  | "gray";

export interface CategoryDefinition {
  name: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  slot: CategorySlot;
}

export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  { name: "Housing", type: "EXPENSE", slot: "blue" },
  { name: "Groceries", type: "EXPENSE", slot: "orange" },
  { name: "Transport", type: "EXPENSE", slot: "aqua" },
  { name: "Restaurants", type: "EXPENSE", slot: "yellow" },
  { name: "Shopping", type: "EXPENSE", slot: "magenta" },
  { name: "Subscriptions", type: "EXPENSE", slot: "green" },
  { name: "Utilities", type: "EXPENSE", slot: "violet" },
  { name: "Entertainment", type: "EXPENSE", slot: "red" },
  { name: "Health", type: "EXPENSE", slot: "blue" },
  { name: "Insurance", type: "EXPENSE", slot: "orange" },
  { name: "Travel", type: "EXPENSE", slot: "aqua" },
  { name: "Education", type: "EXPENSE", slot: "yellow" },
  { name: "Personal care", type: "EXPENSE", slot: "magenta" },
  { name: "Fees", type: "EXPENSE", slot: "green" },
  { name: "Income", type: "INCOME", slot: "blue" },
  { name: "Transfers", type: "TRANSFER", slot: "gray" },
  { name: "Uncategorized", type: "EXPENSE", slot: "gray" },
];

export const UNCATEGORIZED = "Uncategorized";
export const TRANSFERS = "Transfers";
export const INCOME = "Income";

/** CSS custom property for a category's chart color (see globals.css). */
export function categoryColorVar(slot: CategorySlot): string {
  return `var(--series-${slot})`;
}

export function categorySlotFor(name: string): CategorySlot {
  return DEFAULT_CATEGORIES.find((c) => c.name === name)?.slot ?? "gray";
}

/** Fixed priority order used to assign chart hues — stable, never cycled. */
const MASTER_CATEGORY_ORDER = DEFAULT_CATEGORIES.filter((c) => c.type === "EXPENSE").map((c) => c.name);

const CHART_HUES: CategorySlot[] = ["blue", "orange", "aqua", "yellow", "magenta", "green", "violet", "red"];

/**
 * Assigns each of the given category names a distinct chart hue (no two
 * categories shown together ever collide), by walking the fixed master
 * order rather than the caller's amount-ranked order. At most 8 distinct
 * names are expected (the Overview dashboard already caps at top-7 + Other).
 */
export function assignChartColors(names: string[]): Map<string, string> {
  const present = new Set(names);
  const ordered = [
    ...MASTER_CATEGORY_ORDER.filter((name) => present.has(name)),
    ...names.filter((name) => !MASTER_CATEGORY_ORDER.includes(name)).sort(),
  ];

  const colors = new Map<string, string>();
  ordered.forEach((name, index) => {
    const hue = CHART_HUES[index % CHART_HUES.length];
    colors.set(name, categoryColorVar(hue));
  });
  return colors;
}
