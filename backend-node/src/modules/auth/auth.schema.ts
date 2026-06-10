import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z.string().email(),
    firstName: z.string().max(150).optional().default(''),
    lastName: z.string().max(150).optional().default(''),
    password: z.string().min(8),
    passwordConfirm: z.string(),
    currency: z.string().length(3).optional().default('INR'),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetConfirmSchema = z
  .object({
    token: z.string().uuid(),
    newPassword: z.string().min(8),
    newPasswordConfirm: z.string(),
  })
  .refine((d) => d.newPassword === d.newPasswordConfirm, {
    message: 'Passwords do not match',
    path: ['newPasswordConfirm'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    newPasswordConfirm: z.string(),
  })
  .refine((d) => d.newPassword === d.newPasswordConfirm, {
    message: 'Passwords do not match',
    path: ['newPasswordConfirm'],
  });

const themeEnum = z.enum(['light', 'dark', 'system']);

export const updateProfileSchema = z.object({
  firstName: z.string().max(150).optional(),
  lastName: z.string().max(150).optional(),
  profile: z
    .object({
      avatarUrl: z.string().optional(),
      currency: z.string().length(3).optional(),
      timezone: z.string().max(50).optional(),
      theme: themeEnum.optional(),
    })
    .optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
