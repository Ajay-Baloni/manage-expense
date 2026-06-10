import { z } from 'zod';

export const createBudgetSchema = z.object({
  category: z.string().min(1),
  period: z.enum(['weekly', 'monthly']).optional().default('monthly'),
  limitAmount: z.coerce.number().positive(),
  alertThreshold: z.coerce.number().int().min(1).max(100).optional().default(80),
});

export const updateBudgetSchema = z.object({
  category: z.string().min(1).optional(),
  period: z.enum(['weekly', 'monthly']).optional(),
  limitAmount: z.coerce.number().positive().optional(),
  alertThreshold: z.coerce.number().int().min(1).max(100).optional(),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
