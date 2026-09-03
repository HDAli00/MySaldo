export function monthBounds(month: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));
  return { start, end };
}

export function toMonthString(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Returns the "YYYY-MM" string for the month immediately after the given one. */
export function nextMonthString(month: string): string {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const next = new Date(Date.UTC(year, monthIndex + 1, 1));
  return toMonthString(next);
}

/** Days in the given "YYYY-MM" month. */
export function daysInMonth(month: string): number {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}
