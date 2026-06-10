import type { ImportJob, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { toNumber, toYMD } from '../../utils/serialize.js';
import { parseYMD } from '../../utils/period.js';
import { parseCsv, parseFlexibleDate } from './csv.js';

export interface ImportError {
  row: number;
  error: string;
}

export interface ImportResult {
  jobId: string;
  totalRows: number;
  importedRows: number;
  errorCount: number;
  errors: ImportError[];
}

const INCOME_HINTS = new Set(['income', 'credit', 'deposit']);

export async function importCsv(userId: string, fileName: string, content: string): Promise<ImportResult> {
  const job = await prisma.importJob.create({
    data: { userId, fileName, status: 'processing' },
  });

  const errors: ImportError[] = [];
  let imported = 0;
  let total = 0;

  try {
    const rows = parseCsv(content);
    total = rows.length;

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const lineNo = i + 2; // header is line 1
      try {
        const rawDate = row['date'] ?? '';
        const rawAmount = row['amount'] ?? '';
        const description = row['description'] || row['name'] || 'Imported';

        if (!rawDate || !rawAmount) {
          errors.push({ row: lineNo, error: 'Missing date or amount' });
          continue;
        }

        const parsedDate = parseFlexibleDate(rawDate);
        if (!parsedDate) {
          errors.push({ row: lineNo, error: `Invalid date format: ${rawDate}` });
          continue;
        }

        const cleanedAmount = rawAmount.replace(/,/g, '').replace(/\$/g, '').trim();
        const amount = Math.abs(Number(cleanedAmount));
        if (!Number.isFinite(amount) || cleanedAmount === '') {
          errors.push({ row: lineNo, error: `Invalid amount: ${rawAmount}` });
          continue;
        }

        const rawType = (row['type'] ?? 'expense').toLowerCase();
        const type = INCOME_HINTS.has(rawType) ? 'income' : 'expense';

        let categoryId: string | null = null;
        const catName = row['category'] ?? '';
        if (catName) {
          const existing = await prisma.category.findFirst({
            where: {
              name: { equals: catName, mode: 'insensitive' },
              OR: [{ userId }, { userId: null }],
            },
          });
          if (existing) {
            categoryId = existing.id;
          } else {
            const created = await prisma.category.create({
              data: { userId, name: catName, type },
            });
            categoryId = created.id;
          }
        }

        await prisma.transaction.create({
          data: { userId, type, amount, categoryId, date: parsedDate, description },
        });
        imported += 1;
      } catch (err) {
        errors.push({ row: lineNo, error: err instanceof Error ? err.message : String(err) });
      }
    }
  } catch (err) {
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        errorsJson: [{ row: 0, error: err instanceof Error ? err.message : String(err) }],
      },
    });
    throw err;
  }

  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: 'completed',
      totalRows: total,
      importedRows: imported,
      errorsJson: errors as unknown as Prisma.InputJsonValue,
    },
  });

  return { jobId: job.id, totalRows: total, importedRows: imported, errorCount: errors.length, errors: errors.slice(0, 20) };
}

export interface ExportFilters {
  dateFrom?: string;
  dateTo?: string;
  type?: 'income' | 'expense';
  category?: string;
}

export async function transactionsForExport(userId: string, filters: ExportFilters) {
  const where: Prisma.TransactionWhereInput = { userId };
  if (filters.type) where.type = filters.type;
  if (filters.category) where.categoryId = filters.category;
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = parseYMD(filters.dateFrom) ?? undefined;
    if (filters.dateTo) where.date.lte = parseYMD(filters.dateTo) ?? undefined;
  }
  return prisma.transaction.findMany({
    where,
    include: { category: true },
    orderBy: { date: 'desc' },
  });
}

export function serializeImportJob(j: ImportJob) {
  const errs = Array.isArray(j.errorsJson) ? j.errorsJson : [];
  return {
    id: j.id,
    fileName: j.fileName,
    status: j.status,
    totalRows: j.totalRows,
    importedRows: j.importedRows,
    errorCount: errs.length,
    createdAt: j.createdAt.toISOString(),
  };
}

export async function listImportJobs(userId: string): Promise<ImportJob[]> {
  return prisma.importJob.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 });
}

export { toNumber, toYMD };
