import type { Tag } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import type { CreateTagInput } from './tags.schema.js';

export function serializeTag(t: Tag) {
  return { id: t.id, name: t.name, color: t.color };
}

export async function listTags(userId: string): Promise<Tag[]> {
  return prisma.tag.findMany({ where: { userId }, orderBy: { name: 'asc' } });
}

export async function createTag(userId: string, input: CreateTagInput): Promise<Tag> {
  return prisma.tag.create({
    data: { userId, name: input.name, color: input.color ?? '#6366f1' },
  });
}

async function loadTag(userId: string, id: string): Promise<Tag> {
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag || tag.userId !== userId) throw AppError.notFound('Tag not found');
  return tag;
}

export async function updateTag(userId: string, id: string, input: Partial<CreateTagInput>): Promise<Tag> {
  await loadTag(userId, id);
  return prisma.tag.update({ where: { id }, data: input });
}

export async function deleteTag(userId: string, id: string): Promise<void> {
  await loadTag(userId, id);
  await prisma.tag.delete({ where: { id } });
}
