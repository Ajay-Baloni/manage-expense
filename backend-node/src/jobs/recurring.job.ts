import cron from 'node-cron';
import type { RecurringFrequency, RecurringRule } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { checkBudgetThresholds } from './budgetAlerts.js';

/** Advance a date by one frequency step (UTC, date-only). */
function advance(date: Date, frequency: RecurringFrequency): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  switch (frequency) {
    case 'daily':
      return new Date(Date.UTC(y, m, d + 1));
    case 'weekly':
      return new Date(Date.UTC(y, m, d + 7));
    case 'monthly':
      return new Date(Date.UTC(y, m + 1, d));
    case 'yearly':
      return new Date(Date.UTC(y + 1, m, d));
  }
}

/** Today at UTC midnight (date-only comparison boundary). */
function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function materializeRule(rule: RecurringRule, today: Date): Promise<void> {
  let nextRun = rule.nextRun;

  // Generate a transaction for every due occurrence up to today, advancing
  // nextRun each time. Caps at 1000 iterations as a safety valve.
  for (let guard = 0; guard < 1000; guard += 1) {
    if (nextRun > today) break;
    if (rule.endDate && nextRun > rule.endDate) break;

    await prisma.transaction.create({
      data: {
        userId: rule.userId,
        type: rule.type,
        amount: rule.amount,
        categoryId: rule.categoryId,
        date: nextRun,
        description: rule.description,
        notes: 'Auto-generated from recurring rule',
      },
    });

    if (rule.type === 'expense' && rule.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: rule.categoryId } });
      if (category) await checkBudgetThresholds(rule.userId, category);
    }

    nextRun = advance(nextRun, rule.frequency);
  }

  const deactivate = rule.endDate ? nextRun > rule.endDate : false;
  await prisma.recurringRule.update({
    where: { id: rule.id },
    data: { nextRun, ...(deactivate ? { isActive: false } : {}) },
  });
}

/** Process all active rules whose nextRun is due. */
export async function runRecurring(): Promise<number> {
  const today = todayUTC();
  const rules = await prisma.recurringRule.findMany({
    where: { isActive: true, nextRun: { lte: today } },
  });
  for (const rule of rules) {
    try {
      await materializeRule(rule, today);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Recurring rule ${rule.id} failed:`, err);
    }
  }
  return rules.length;
}

/** Schedule the daily recurring job (00:10 server time). */
export function startRecurringJob(): void {
  cron.schedule('10 0 * * *', () => {
    runRecurring()
      .then((n) => {
        if (n > 0) {
          // eslint-disable-next-line no-console
          console.log(`⏱️  Recurring job processed ${n} rule(s)`);
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Recurring job error:', err);
      });
  });
}
