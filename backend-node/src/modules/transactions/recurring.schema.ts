import { z } from 'zod';

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

export const createRecurringSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive(),
  category: z.string().nullable().optional(),
  description: z.string().min(1).max(255),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  startDate: ymd,
  endDate: ymd.nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateRecurringSchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
  amount: z.coerce.number().positive().optional(),
  category: z.string().nullable().optional(),
  description: z.string().min(1).max(255).optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  startDate: ymd.optional(),
  endDate: ymd.nullable().optional(),
  isActive: z.boolean().optional(),
});

export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;
export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>;
