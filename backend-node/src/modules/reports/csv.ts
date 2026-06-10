/** Minimal CSV utilities — no external dependency. */

/** Parse CSV text into an array of row objects keyed by (trimmed, lowercased) header. */
export function parseCsv(text: string): Record<string, string>[] {
  // Strip UTF-8 BOM.
  const clean = text.replace(/^﻿/, '');
  const rows = splitRows(clean);
  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (cells[idx] ?? '').trim();
    });
    return obj;
  });
}

/** Split CSV into rows of cells, honoring quoted fields and escaped quotes. */
function splitRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  // Trailing field/row (no final newline).
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.length > 0)) rows.push(row);
  }
  return rows;
}

/** Escape and join a single CSV row. */
export function csvRow(values: (string | number)[]): string {
  return values
    .map((v) => {
      const s = String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    })
    .join(',');
}

/** Try to parse a date string in several common formats → YYYY-MM-DD Date (UTC), or null. */
export function parseFlexibleDate(raw: string): Date | null {
  const value = raw.trim();
  // ISO: YYYY-MM-DD
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return utc(+m[1], +m[2], +m[3]);

  // M/D/Y or D/M/Y (ambiguous): assume M/D/Y when first part > 12 is impossible.
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const year = +m[3];
    // If first > 12 it must be day (D/M/Y); otherwise treat as M/D/Y.
    if (a > 12) return utc(year, b, a);
    return utc(year, a, b);
  }

  // D-M-Y or M-D-Y
  m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(value);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const year = +m[3];
    if (a > 12) return utc(year, b, a);
    return utc(year, a, b);
  }
  return null;
}

function utc(y: number, month: number, d: number): Date | null {
  const date = new Date(Date.UTC(y, month - 1, d));
  if (Number.isNaN(date.getTime()) || date.getUTCMonth() !== month - 1) return null;
  return date;
}
