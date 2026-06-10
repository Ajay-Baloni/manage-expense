import { Prisma } from '@prisma/client';

/** Convert a Prisma Decimal (or number/null) to a JS number for JSON output. */
export function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return value.toNumber();
}

/** Format a Date as a YYYY-MM-DD date string (date-only fields). */
export function toYMD(date: Date): string {
  return date.toISOString().slice(0, 10);
}
