import type { Budget, BudgetAlert, Category } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { periodRange, monthStart, parseYMD } from '../../utils/period.js';
import { toNumber, toYMD } from '../../utils/serialize.js';
import type { CreateBudgetInput, UpdateBudgetInput } from './budgets.schema.js';

type BudgetWithRelations = Budget & { category: Category; alerts: BudgetAlert[] };

/** Serialize a budget with spend computed over its current period. */
export async function serializeBudget(budget: BudgetWithRelations) {
  const [start, end] = periodRange(budget.period);
  const agg = await prisma.transaction.aggregate({
    where: {
      userId: budget.userId,
      categoryId: budget.categoryId,
      type: 'expense',
      date: { gte: start, lte: end },
    },
    _sum: { amount: true },
  });
  const spent = toNumber(agg._sum.amount);
  const limit = toNumber(budget.limitAmount);
  const percentageUsed = limit > 0 ? Math.round((spent / limit) * 100 * 100) / 100 : 0;

  return {
    id: budget.id,
    category: budget.categoryId,
    categoryName: budget.category.name,
    categoryColor: budget.category.color,
    categoryIcon: budget.category.icon,
    period: budget.period,
    month: toYMD(budget.month),
    limitAmount: limit,
    alertThreshold: budget.alertThreshold,
    spentAmount: spent,
    percentageUsed,
    periodStart: toYMD(start),
    periodEnd: toYMD(end),
    alerts: budget.alerts.map((a) => ({
      id: a.id,
      triggeredAt: a.triggeredAt.toISOString(),
      percentageUsed: toNumber(a.percentageUsed),
      level: a.level,
    })),
  };
}

export async function listBudgets(userId: string, month?: string): Promise<BudgetWithRelations[]> {
  const where: { userId: string; month?: Date } = { userId };
  if (month) {
    const parsed = parseYMD(`${month}-01`);
    if (parsed) where.month = parsed;
  }
  return prisma.budget.findMany({
    where,
    include: { category: true, alerts: { orderBy: { triggeredAt: 'desc' } } },
  });
}

async function loadBudget(userId: string, id: string): Promise<BudgetWithRelations> {
  const budget = await prisma.budget.findUnique({
    where: { id },
    include: { category: true, alerts: { orderBy: { triggeredAt: 'desc' } } },
  });
  if (!budget || budget.userId !== userId) throw AppError.notFound('Budget not found');
  return budget;
}

export async function getBudget(userId: string, id: string): Promise<BudgetWithRelations> {
  return loadBudget(userId, id);
}

async function assertCategoryUsable(userId: string, categoryId: string): Promise<void> {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || (category.userId !== null && category.userId !== userId)) {
    throw AppError.badRequest('Invalid category');
  }
}

export async function createBudget(userId: string, input: CreateBudgetInput): Promise<BudgetWithRelations> {
  await assertCategoryUsable(userId, input.category);
  const budget = await prisma.budget.create({
    data: {
      userId,
      categoryId: input.category,
      period: input.period ?? 'monthly',
      limitAmount: input.limitAmount,
      alertThreshold: input.alertThreshold ?? 80,
      month: monthStart(),
    },
    include: { category: true, alerts: true },
  });
  return budget;
}

export async function updateBudget(
  userId: string,
  id: string,
  input: UpdateBudgetInput,
): Promise<BudgetWithRelations> {
  await loadBudget(userId, id);
  if (input.category) await assertCategoryUsable(userId, input.category);
  await prisma.budget.update({
    where: { id },
    data: {
      ...(input.category ? { categoryId: input.category } : {}),
      ...(input.period ? { period: input.period } : {}),
      ...(input.limitAmount !== undefined ? { limitAmount: input.limitAmount } : {}),
      ...(input.alertThreshold !== undefined ? { alertThreshold: input.alertThreshold } : {}),
    },
  });
  return loadBudget(userId, id);
}

export async function deleteBudget(userId: string, id: string): Promise<void> {
  await loadBudget(userId, id);
  await prisma.budget.delete({ where: { id } });
}
