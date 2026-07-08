import type { Budget, Category } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { periodRange } from '../utils/period.js';
import { toNumber } from '../utils/serialize.js';

/** Sum of expense transactions for a budget's category over [start, end]. */
async function spentForBudget(budget: Budget, start: Date, end: Date): Promise<number> {
  const agg = await prisma.transaction.aggregate({
    where: {
      userId: budget.userId,
      categoryId: budget.categoryId,
      type: 'expense',
      date: { gte: start, lte: end },
    },
    _sum: { amount: true },
  });
  return toNumber(agg._sum.amount);
}

/**
 * Check every budget for this user+category and record an in-app alert on
 * threshold crossings. Dedup'd per (budget, periodStart, level). Never throws
 * into the caller.
 */
export async function checkBudgetThresholds(userId: string, category: Category): Promise<void> {
  try {
    const budgets = await prisma.budget.findMany({
      where: { userId, categoryId: category.id },
    });
    for (const budget of budgets) {
      await checkSingleBudget(budget).catch((err) => {
        // eslint-disable-next-line no-console
        console.error(`Budget threshold check failed for budget ${budget.id}:`, err);
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('checkBudgetThresholds failed:', err);
  }
}

async function checkSingleBudget(budget: Budget): Promise<void> {
  const limit = toNumber(budget.limitAmount);
  if (limit <= 0) return;

  const [start, end] = periodRange(budget.period);
  const spent = await spentForBudget(budget, start, end);
  const pct = Math.round((spent / limit) * 100 * 100) / 100;

  let level: 'warning' | 'exceeded';
  if (pct >= 100) level = 'exceeded';
  else if (pct >= budget.alertThreshold) level = 'warning';
  else return;

  const alreadyRecorded = await prisma.budgetAlert.findFirst({
    where: { budgetId: budget.id, periodStart: start, level },
  });
  if (alreadyRecorded) return;

  await prisma.budgetAlert.create({
    data: { budgetId: budget.id, percentageUsed: pct, periodStart: start, level },
  });
}
