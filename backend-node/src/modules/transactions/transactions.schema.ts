import { z } from 'zod';

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

export const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive(),
  category: z.string().nullable().optional(),
  date: ymd,
  description: z.string().min(1).max(255),
  tagIds: z.array(z.string()).optional().default([]),
  receiptUrl: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

export const updateTransactionSchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
  amount: z.coerce.number().positive().optional(),
  category: z.string().nullable().optional(),
  date: ymd.optional(),
  description: z.string().min(1).max(255).optional(),
  tagIds: z.array(z.string()).optional(),
  receiptUrl: z.string().optional(),
  notes: z.string().optional(),
});

export const listTransactionsQuerySchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
  category: z.string().optional(),
  dateFrom: ymd.optional(),
  dateTo: ymd.optional(),
  amountMin: z.coerce.number().optional(),
  amountMax: z.coerce.number().optional(),
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v === undefined ? undefined : Array.isArray(v) ? v : v.split(','))),
  search: z.string().optional(),
  ordering: z.enum(['date', '-date', 'amount', '-amount', 'createdAt', '-createdAt']).optional().default('-date'),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
