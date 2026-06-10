import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8000),
  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('7d'),
  REFRESH_TOKEN_TTL_REMEMBER: z.string().default('30d'),

  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),

  MAIL_HOST: z.string().optional().default(''),
  MAIL_PORT: z.coerce.number().default(587),
  MAIL_USER: z.string().optional().default(''),
  MAIL_PASSWORD: z.string().optional().default(''),
  MAIL_FROM: z.string().default('Manage Expense <no-reply@manage-expense.local>'),

  UPLOAD_DIR: z.string().default('uploads'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
