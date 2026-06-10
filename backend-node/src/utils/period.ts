import type { BudgetPeriod } from '@prisma/client';

/**
 * Return [start, end] dates (UTC, date-only) for the current weekly or monthly
 * period. Weekly = Monday..Sunday; monthly = first..last day of the month.
 * Mirrors the Django `period_range` helper.
 */
export function periodRange(period: BudgetPeriod, today: Date = new Date()): [Date, Date] {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const d = today.getUTCDate();

  if (period === 'weekly') {
    const dow = today.getUTCDay(); // 0 = Sun .. 6 = Sat
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const start = new Date(Date.UTC(y, m, d + mondayOffset));
    const end = new Date(Date.UTC(y, m, d + mondayOffset + 6));
    return [start, end];
  }

  // monthly
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 0)); // day 0 of next month = last day of this month
  return [start, end];
}

/** First day of the month for a given date (UTC, date-only). */
export function monthStart(today: Date = new Date()): Date {
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
}

/** Parse a YYYY-MM-DD string into a UTC date-only Date, or null if invalid. */
export function parseYMD(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}
