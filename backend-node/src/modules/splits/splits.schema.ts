import { z } from 'zod';

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

export const createGroupSchema = z.object({
  name: z.string().min(1).max(150),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(150).optional(),
});

export const addMemberSchema = z
  .object({
    userId: z.string().optional(),
    guestUser: z
      .object({
        name: z.string().min(1).max(150),
        email: z.string().email().optional().or(z.literal('')),
      })
      .optional(),
  })
  .refine((d) => d.userId || d.guestUser, {
    message: 'Provide userId or guestUser',
  });

export const shareInputSchema = z.object({
  memberId: z.string(),
  shareAmount: z.coerce.number().nonnegative(),
});

export const createExpenseSchema = z.object({
  group: z.string().min(1),
  paidByUser: z.string().nullable().optional(),
  paidByGuest: z.string().nullable().optional(),
  amount: z.coerce.number().positive(),
  description: z.string().min(1).max(255),
  date: ymd,
  splitType: z.enum(['equal', 'exact', 'percentage', 'shares']).optional().default('equal'),
  sharesData: z.array(shareInputSchema).optional(),
});

export const settleSchema = z.object({
  payerMember: z.string(),
  receiverMember: z.string(),
  amount: z.coerce.number().positive(),
  note: z.string().max(255).optional().default(''),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type SettleInput = z.infer<typeof settleSchema>;
