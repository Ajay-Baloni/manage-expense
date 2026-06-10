import type { Category } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import type { CreateCategoryInput } from './categories.schema.js';

export function serializeCategory(c: Category) {
  return {
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    type: c.type,
    isDefault: c.isDefault,
    createdAt: c.createdAt.toISOString(),
  };
}

/** A user sees their own categories plus the shared defaults (userId = null). */
export async function listCategories(userId: string): Promise<Category[]> {
  return prisma.category.findMany({
    where: { OR: [{ userId }, { userId: null }] },
    orderBy: { name: 'asc' },
  });
}

export async function createCategory(userId: string, input: CreateCategoryInput): Promise<Category> {
  return prisma.category.create({
    data: {
      userId,
      name: input.name,
      icon: input.icon ?? 'tag',
      color: input.color ?? '#6366f1',
      type: input.type ?? 'both',
    },
  });
}

/** Loads a category the user is allowed to mutate (owned, non-default). */
async function getOwnedCategory(userId: string, id: string): Promise<Category> {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw AppError.notFound('Category not found');
  if (category.userId === null) throw AppError.forbidden('Cannot modify default categories');
  if (category.userId !== userId) throw AppError.forbidden('Cannot modify another user\'s category');
  return category;
}

export async function updateCategory(
  userId: string,
  id: string,
  input: Partial<CreateCategoryInput>,
): Promise<Category> {
  await getOwnedCategory(userId, id);
  return prisma.category.update({ where: { id }, data: input });
}

export async function deleteCategory(userId: string, id: string): Promise<void> {
  await getOwnedCategory(userId, id);
  await prisma.category.delete({ where: { id } });
}
