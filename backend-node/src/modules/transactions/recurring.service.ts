import type { RecurringRule } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { toNumber, toYMD } from '../../utils/serialize.js';
import { parseYMD } from '../../utils/period.js';
import type { CreateRecurringInput, UpdateRecurringInput } from './recurring.schema.js';

export function serializeRecurring(r: RecurringRule) {
  return {
    id: r.id,
    type: r.type,
    amount: toNumber(r.amount),
    category: r.categoryId,
    description: r.description,
    frequency: r.frequency,
    startDate: toYMD(r.startDate),
    nextRun: toYMD(r.nextRun),
    endDate: r.endDate ? toYMD(r.endDate) : null,
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
  };
}

async function assertCategoryUsable(userId: string, categoryId: string | null | undefined): Promise<void> {
  if (!categoryId) return;
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || (category.userId !== null && category.userId !== userId)) {
    throw AppError.badRequest('Invalid category');
  }
}

export async function listRecurring(userId: string): Promise<RecurringRule[]> {
  return prisma.recurringRule.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

export async function createRecurring(userId: string, input: CreateRecurringInput): Promise<RecurringRule> {
  await assertCategoryUsable(userId, input.category);
  const startDate = parseYMD(input.startDate)!;
  return prisma.recurringRule.create({
    data: {
      userId,
      type: input.type,
      amount: input.amount,
      categoryId: input.category ?? null,
      description: input.description,
      frequency: input.frequency,
      startDate,
      nextRun: startDate, // first run is the start date
      endDate: input.endDate ? parseYMD(input.endDate) : null,
      isActive: input.isActive ?? true,
    },
  });
}

async function loadRecurring(userId: string, id: string): Promise<RecurringRule> {
  const rule = await prisma.recurringRule.findUnique({ where: { id } });
  if (!rule || rule.userId !== userId) throw AppError.notFound('Recurring rule not found');
  return rule;
}

export async function updateRecurring(
  userId: string,
  id: string,
  input: UpdateRecurringInput,
): Promise<RecurringRule> {
  await loadRecurring(userId, id);
  if (input.category !== undefined) await assertCategoryUsable(userId, input.category);
  return prisma.recurringRule.update({
    where: { id },
    data: {
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.category !== undefined ? { categoryId: input.category } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
      ...(input.startDate !== undefined ? { startDate: parseYMD(input.startDate)! } : {}),
      ...(input.endDate !== undefined ? { endDate: input.endDate ? parseYMD(input.endDate) : null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

export async function deleteRecurring(userId: string, id: string): Promise<void> {
  await loadRecurring(userId, id);
  await prisma.recurringRule.delete({ where: { id } });
}
