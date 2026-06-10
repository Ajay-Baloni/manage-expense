import type { Budget, Category } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { sendMail } from '../lib/mailer.js';
import { periodRange } from '../utils/period.js';
import { toNumber } from '../utils/serialize.js';

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
};

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
 * Check every budget for this user+category and email on threshold crossings.
 * Dedup'd per (budget, periodStart, level). Never throws into the caller.
 */
export async function checkBudgetThresholds(userId: string, category: Category): Promise<void> {
  try {
    const budgets = await prisma.budget.findMany({
      where: { userId, categoryId: category.id },
    });
    for (const budget of budgets) {
      await checkSingleBudget(userId, budget, category).catch((err) => {
        // eslint-disable-next-line no-console
        console.error(`Budget threshold check failed for budget ${budget.id}:`, err);
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('checkBudgetThresholds failed:', err);
  }
}

async function checkSingleBudget(userId: string, budget: Budget, category: Category): Promise<void> {
  const limit = toNumber(budget.limitAmount);
  if (limit <= 0) return;

  const [start, end] = periodRange(budget.period);
  const spent = await spentForBudget(budget, start, end);
  const pct = Math.round((spent / limit) * 100 * 100) / 100;

  let level: 'warning' | 'exceeded';
  if (pct >= 100) level = 'exceeded';
  else if (pct >= budget.alertThreshold) level = 'warning';
  else return;

  const alreadySent = await prisma.budgetAlert.findFirst({
    where: { budgetId: budget.id, periodStart: start, level },
  });
  if (alreadySent) return;

  await prisma.budgetAlert.create({
    data: { budgetId: budget.id, percentageUsed: pct, periodStart: start, level },
  });

  await sendAlertEmail(userId, budget, category, spent, pct, level);
}

async function sendAlertEmail(
  userId: string,
  budget: Budget,
  category: Category,
  spent: number,
  pct: number,
  level: 'warning' | 'exceeded',
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
  if (!user?.email) return;

  const currency = user.profile?.currency ?? 'INR';
  const symbol = CURRENCY_SYMBOLS[currency] ?? '';
  const limit = toNumber(budget.limitAmount);
  const fmt = (n: number) => `${symbol}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const periodNoun = budget.period === 'weekly' ? 'week' : 'month';

  const subject =
    level === 'exceeded'
      ? `⚠️ Over budget: ${category.name}`
      : `Heads up: ${category.name} budget at ${Math.round(pct)}%`;

  const text =
    `Hi ${user.firstName || user.email},\n\n` +
    `Your ${budget.period} budget for "${category.name}" is at ${pct}%.\n` +
    `Spent ${fmt(spent)} of ${fmt(limit)} this ${periodNoun} ` +
    `(${fmt(Math.max(limit - spent, 0))} remaining).\n`;

  await sendMail({ to: user.email, subject, text });
}
