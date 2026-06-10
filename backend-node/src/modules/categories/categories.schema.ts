import { z } from 'zod';

const categoryType = z.enum(['income', 'expense', 'both']);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color like #6366f1');

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(50).optional().default('tag'),
  color: hexColor.optional().default('#6366f1'),
  type: categoryType.optional().default('both'),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
