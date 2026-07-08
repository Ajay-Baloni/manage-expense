import type { Prisma, Category, Transaction } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { toNumber, toYMD } from '../../utils/serialize.js';
import { parseYMD } from '../../utils/period.js';
import { serializeCategory } from '../categories/categories.service.js';
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
  ListTransactionsQuery,
} from './transactions.schema.js';

type TransactionFull = Transaction & { category: Category | null };

export function serializeTransaction(t: TransactionFull) {
  return {
    id: t.id,
    type: t.type,
    amount: toNumber(t.amount),
    category: t.categoryId,
    categoryDetail: t.category ? serializeCategory(t.category) : null,
    date: toYMD(t.date),
    description: t.description,
    notes: t.notes,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

const ORDER_MAP: Record<string, Prisma.TransactionOrderByWithRelationInput> = {
  date: { date: 'asc' },
  '-date': { date: 'desc' },
  amount: { amount: 'asc' },
  '-amount': { amount: 'desc' },
  createdAt: { createdAt: 'asc' },
  '-createdAt': { createdAt: 'desc' },
};

export async function listTransactions(userId: string, q: ListTransactionsQuery): Promise<TransactionFull[]> {
  const where: Prisma.TransactionWhereInput = { userId };
  if (q.type) where.type = q.type;
  if (q.category) where.categoryId = q.category;
  if (q.dateFrom || q.dateTo) {
    where.date = {};
    if (q.dateFrom) where.date.gte = parseYMD(q.dateFrom) ?? undefined;
    if (q.dateTo) where.date.lte = parseYMD(q.dateTo) ?? undefined;
  }
  if (q.amountMin !== undefined || q.amountMax !== undefined) {
    where.amount = {};
    if (q.amountMin !== undefined) where.amount.gte = q.amountMin;
    if (q.amountMax !== undefined) where.amount.lte = q.amountMax;
  }
  if (q.search) {
    where.OR = [
      { description: { contains: q.search, mode: 'insensitive' } },
      { notes: { contains: q.search, mode: 'insensitive' } },
    ];
  }

  return prisma.transaction.findMany({
    where,
    include: { category: true },
    orderBy: [ORDER_MAP[q.ordering] ?? { date: 'desc' }, { createdAt: 'desc' }],
  });
}

async function assertCategoryUsable(userId: string, categoryId: string | null | undefined): Promise<void> {
  if (!categoryId) return;
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || (category.userId !== null && category.userId !== userId)) {
    throw AppError.badRequest('Invalid category');
  }
}

async function loadTransaction(userId: string, id: string): Promise<TransactionFull> {
  const txn = await prisma.transaction.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!txn || txn.userId !== userId) throw AppError.notFound('Transaction not found');
  return txn;
}

export async function getTransaction(userId: string, id: string): Promise<TransactionFull> {
  return loadTransaction(userId, id);
}

export async function createTransaction(
  userId: string,
  input: CreateTransactionInput,
): Promise<TransactionFull> {
  await assertCategoryUsable(userId, input.category);
  return prisma.transaction.create({
    data: {
      userId,
      type: input.type,
      amount: input.amount,
      categoryId: input.category ?? null,
      date: parseYMD(input.date)!,
      description: input.description,
      notes: input.notes ?? '',
    },
    include: { category: true },
  });
}

export async function updateTransaction(
  userId: string,
  id: string,
  input: UpdateTransactionInput,
): Promise<TransactionFull> {
  await loadTransaction(userId, id);
  if (input.category !== undefined) await assertCategoryUsable(userId, input.category);

  const data: Prisma.TransactionUpdateInput = {};
  if (input.type !== undefined) data.type = input.type;
  if (input.amount !== undefined) data.amount = input.amount;
  if (input.category !== undefined) {
    data.category = input.category ? { connect: { id: input.category } } : { disconnect: true };
  }
  if (input.date !== undefined) data.date = parseYMD(input.date)!;
  if (input.description !== undefined) data.description = input.description;
  if (input.notes !== undefined) data.notes = input.notes;

  return prisma.transaction.update({
    where: { id },
    data,
    include: { category: true },
  });
}

export async function deleteTransaction(userId: string, id: string): Promise<void> {
  await loadTransaction(userId, id);
  await prisma.transaction.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Dashboard summary
// ---------------------------------------------------------------------------

function pctChange(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prev) / prev) * 100 * 100) / 100;
}

async function sumByType(
  userId: string,
  type: 'income' | 'expense',
  gte: Date,
  lte: Date,
): Promise<number> {
  const agg = await prisma.transaction.aggregate({
    where: { userId, type, date: { gte, lte } },
    _sum: { amount: true },
  });
  return toNumber(agg._sum.amount);
}

export async function dashboardSummary(userId: string) {
  const today = new Date();
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();

  const currentMonthStart = new Date(Date.UTC(y, m, 1));
  const prevMonthStart = new Date(Date.UTC(y, m - 1, 1));
  const prevMonthEnd = new Date(Date.UTC(y, m, 0));
  const todayUTC = new Date(Date.UTC(y, m, today.getUTCDate()));

  const [currentIncome, currentExpense, prevIncome, prevExpense] = await Promise.all([
    sumByType(userId, 'income', currentMonthStart, todayUTC),
    sumByType(userId, 'expense', currentMonthStart, todayUTC),
    sumByType(userId, 'income', prevMonthStart, prevMonthEnd),
    sumByType(userId, 'expense', prevMonthStart, prevMonthEnd),
  ]);

  // Last 6 months breakdown
  const monthlyBreakdown = await Promise.all(
    Array.from({ length: 6 }, (_, idx) => 5 - idx).map(async (back) => {
      const mStart = new Date(Date.UTC(y, m - back, 1));
      const mEnd = new Date(Date.UTC(y, m - back + 1, 0));
      const [income, expense] = await Promise.all([
        sumByType(userId, 'income', mStart, mEnd),
        sumByType(userId, 'expense', mStart, mEnd),
      ]);
      return { month: toYMD(mStart).slice(0, 7), income, expense };
    }),
  );

  // Top expense categories this month
  const grouped = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: { userId, type: 'expense', date: { gte: currentMonthStart, lte: todayUTC } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: 6,
  });
  const categoryIds = grouped.map((g) => g.categoryId).filter((id): id is string => id !== null);
  const categories = await prisma.category.findMany({ where: { id: { in: categoryIds } } });
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const topCategories = grouped.map((g) => {
    const cat = g.categoryId ? catMap.get(g.categoryId) : undefined;
    return {
      name: cat?.name ?? 'Uncategorized',
      color: cat?.color ?? '#64748b',
      icon: cat?.icon ?? 'tag',
      total: toNumber(g._sum.amount),
    };
  });

  return {
    totalIncome: currentIncome,
    totalExpense: currentExpense,
    netBalance: currentIncome - currentExpense,
    incomeChangePct: pctChange(currentIncome, prevIncome),
    expenseChangePct: pctChange(currentExpense, prevExpense),
    monthlyBreakdown,
    topCategories,
  };
}
