import { z } from 'zod';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color like #6366f1');

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: hexColor.optional().default('#6366f1'),
});

export const updateTagSchema = createTagSchema.partial();

export type CreateTagInput = z.infer<typeof createTagSchema>;
