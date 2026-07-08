import { z } from 'zod';

export const createBudgetSchema = z.object({
  category: z.string().min(1),
  period: z.enum(['weekly', 'monthly']).optional().default('monthly'),
  limitAmount: z.coerce.number().positive(),
});

export const updateBudgetSchema = z.object({
  category: z.string().min(1).optional(),
  period: z.enum(['weekly', 'monthly']).optional(),
  limitAmount: z.coerce.number().positive().optional(),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
