import type { Request, Response } from 'express';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt.js';
import {
  registerSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  changePasswordSchema,
  updateProfileSchema,
} from './auth.schema.js';
import * as authService from './auth.service.js';

const REFRESH_COOKIE = 'refreshToken';
const DAY_MS = 24 * 60 * 60 * 1000;

function setRefreshCookie(res: Response, token: string, rememberMe: boolean): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: (rememberMe ? 30 : 7) * DAY_MS,
  });
}

export async function register(req: Request, res: Response): Promise<void> {
  const input = registerSchema.parse(req.body);
  const user = await authService.registerUser(input);
  const access = signAccessToken(user.id);
  const refresh = signRefreshToken(user.id, false);
  setRefreshCookie(res, refresh, false);
  res.status(201).json({ user: authService.serializeUser(user), access, refresh });
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = loginSchema.parse(req.body);
  const user = await authService.authenticate(input.email, input.password);
  const access = signAccessToken(user.id);
  const refresh = signRefreshToken(user.id, input.rememberMe);
  setRefreshCookie(res, refresh, input.rememberMe);
  res.json({ user: authService.serializeUser(user), access, refresh });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie(REFRESH_COOKIE);
  res.json({ detail: 'Logged out successfully' });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = (req.body?.refresh as string | undefined) ?? req.cookies?.[REFRESH_COOKIE];
  if (!token) throw AppError.badRequest('Refresh token required');
  let userId: string;
  try {
    userId = verifyRefreshToken(token).sub;
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }
  res.json({ access: signAccessToken(userId) });
}

export async function passwordResetRequest(req: Request, res: Response): Promise<void> {
  const { email } = passwordResetRequestSchema.parse(req.body);
  await authService.requestPasswordReset(email);
  res.json({ detail: 'If this email exists, a reset link has been sent' });
}

export async function passwordResetConfirm(req: Request, res: Response): Promise<void> {
  const { token, newPassword } = passwordResetConfirmSchema.parse(req.body);
  await authService.confirmPasswordReset(token, newPassword);
  res.json({ detail: 'Password reset successful' });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  await authService.changePassword(req.user!.id, currentPassword, newPassword);
  res.json({ detail: 'Password changed successfully' });
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  const user = await authService.getUserWithProfile(req.user!.id);
  res.json(authService.serializeUser(user));
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const input = updateProfileSchema.parse(req.body);
  const user = await authService.updateProfile(req.user!.id, input);
  res.json(authService.serializeUser(user));
}
