import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import type { Prisma, User, UserProfile } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { sendMail } from '../../lib/mailer.js';
import { env } from '../../config/env.js';
import type { RegisterInput, UpdateProfileInput } from './auth.schema.js';

const RESET_TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

type UserWithProfile = User & { profile: UserProfile | null };

export function serializeUser(user: UserWithProfile) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`.trim() || user.email,
    dateJoined: user.dateJoined.toISOString(),
    profile: user.profile
      ? {
          avatarUrl: user.profile.avatarUrl,
          currency: user.profile.currency,
          timezone: user.profile.timezone,
          theme: user.profile.theme,
        }
      : null,
  };
}

export async function getUserWithProfile(userId: string): Promise<UserWithProfile> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
  if (!user) throw AppError.notFound('User not found');
  return user;
}

export async function registerUser(input: RegisterInput): Promise<UserWithProfile> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw AppError.badRequest('A user with this email already exists');

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      firstName: input.firstName ?? '',
      lastName: input.lastName ?? '',
      passwordHash,
      profile: { create: { currency: input.currency ?? 'INR' } },
    },
    include: { profile: true },
  });
  return user;
}

export async function authenticate(email: string, password: string): Promise<UserWithProfile> {
  const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
  if (!user) throw AppError.badRequest('Invalid email or password');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw AppError.badRequest('Invalid email or password');
  if (!user.isActive) throw AppError.badRequest('Account is disabled');
  return user;
}

/**
 * Always returns silently (no user enumeration). When the user exists, mints a
 * reset token and emails it. In dev the token is logged via the mailer.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  const token = randomUUID();
  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
  });

  const resetUrl = `${env.CORS_ORIGINS[0] ?? ''}/reset-password?token=${token}`;
  await sendMail({
    to: user.email,
    subject: 'Reset your password',
    text: `Use this link to reset your password: ${resetUrl}\nThis link expires in 2 hours.`,
  });
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.isUsed || record.expiresAt <= new Date()) {
    throw AppError.badRequest('Token is invalid, expired, or already used');
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  // Atomically mark used + update password.
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { isUsed: true } }),
  ]);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound('User not found');
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw AppError.badRequest('Current password is incorrect');
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<UserWithProfile> {
  const userData: Prisma.UserUpdateInput = {};
  if (input.firstName !== undefined) userData.firstName = input.firstName;
  if (input.lastName !== undefined) userData.lastName = input.lastName;

  if (input.profile) {
    const p = input.profile;
    userData.profile = {
      upsert: {
        create: {
          avatarUrl: p.avatarUrl ?? '',
          currency: p.currency ?? 'INR',
          timezone: p.timezone ?? 'UTC',
          theme: p.theme ?? 'system',
        },
        update: {
          ...(p.avatarUrl !== undefined ? { avatarUrl: p.avatarUrl } : {}),
          ...(p.currency !== undefined ? { currency: p.currency } : {}),
          ...(p.timezone !== undefined ? { timezone: p.timezone } : {}),
          ...(p.theme !== undefined ? { theme: p.theme } : {}),
        },
      },
    };
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: userData,
    include: { profile: true },
  });
  return user;
}
