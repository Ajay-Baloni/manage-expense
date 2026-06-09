import prisma from '../config/prisma.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import {
  signAccessToken,
  buildRefreshToken,
  refreshCookieMaxAgeMs,
} from '../utils/jwt.js';
import { serializeUser } from '../utils/serialize.js';
import { badRequest, unauthorized } from '../middleware/error.js';

const REFRESH_COOKIE = 'refresh_token';

function setRefreshCookie(res, token, remember) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: refreshCookieMaxAgeMs(remember),
    path: '/',
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'lax', path: '/' });
}

async function loadUserWithProfile(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
}

export async function register(req, res) {
  const {
    email,
    first_name = '',
    last_name = '',
    password,
    password_confirm,
  } = req.body || {};

  if (!email) throw badRequest({ email: ['This field is required.'] });
  if (!password) throw badRequest({ password: ['This field is required.'] });
  if (password !== password_confirm) {
    throw badRequest({ password_confirm: ["Passwords don't match."] });
  }
  if (String(password).length < 8) {
    throw badRequest({ password: ['Password must be at least 8 characters long.'] });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw badRequest({ email: ['A user with this email already exists.'] });
  }

  const hashed = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      firstName: first_name || '',
      lastName: last_name || '',
      password: hashed,
      profile: { create: {} },
    },
    include: { profile: true },
  });

  const access = signAccessToken(user);
  const { token: refresh, expiresAt } = buildRefreshToken({ remember: false });
  await prisma.refreshToken.create({
    data: { userId: user.id, token: refresh, expiresAt },
  });

  res.status(201).json({
    user: serializeUser(user),
    access,
    refresh,
  });
}

export async function login(req, res) {
  const { email, password, remember_me = false } = req.body || {};

  if (!email || !password) {
    throw badRequest({ detail: 'Email and password are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { profile: true },
  });

  if (!user || !(await verifyPassword(password, user.password))) {
    throw unauthorized('No active account found with the given credentials');
  }
  if (!user.isActive) {
    throw unauthorized('This account is inactive.');
  }

  const access = signAccessToken(user);
  const remember = Boolean(remember_me);
  const { token: refresh, expiresAt } = buildRefreshToken({ remember });
  await prisma.refreshToken.create({
    data: { userId: user.id, token: refresh, expiresAt },
  });

  if (remember) {
    setRefreshCookie(res, refresh, true);
  }

  res.json({
    user: serializeUser(user),
    access,
    refresh,
  });
}

export async function logout(req, res) {
  const bodyToken = req.body?.refresh;
  const cookieToken = req.cookies?.[REFRESH_COOKIE];

  const tokensToDelete = [bodyToken, cookieToken].filter(Boolean);
  if (tokensToDelete.length) {
    await prisma.refreshToken.deleteMany({
      where: { token: { in: tokensToDelete }, userId: req.user.id },
    });
  }

  clearRefreshCookie(res);
  res.json({ detail: 'Logged out successfully' });
}

export async function refresh(req, res) {
  const fromCookie = req.cookies?.[REFRESH_COOKIE];
  const provided = req.body?.refresh || fromCookie;

  if (!provided) {
    throw unauthorized('No refresh token provided.');
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { token: provided },
    include: { user: { include: { profile: true } } },
  });

  if (!stored || stored.expiresAt.getTime() < Date.now()) {
    if (stored) {
      await prisma.refreshToken.delete({ where: { id: stored.id } }).catch(() => {});
    }
    throw unauthorized('Token is invalid or expired');
  }

  // Rotate: delete the old token, issue a new one preserving remaining lifetime.
  const remainingMs = stored.expiresAt.getTime() - Date.now();
  const remember = remainingMs > 8 * 24 * 60 * 60 * 1000; // > 8 days left ⇒ a 30-day token

  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const access = signAccessToken(stored.user);
  const { token: newRefresh, expiresAt } = buildRefreshToken({ remember });
  await prisma.refreshToken.create({
    data: { userId: stored.userId, token: newRefresh, expiresAt },
  });

  if (provided === fromCookie) {
    setRefreshCookie(res, newRefresh, remember);
  }

  res.json({ access, refresh: newRefresh });
}

export async function passwordReset(req, res) {
  const { email } = req.body || {};
  const response = { detail: 'If this email exists, a reset link has been sent' };

  if (!email) {
    return res.json(response);
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (user) {
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    const record = await prisma.passwordResetToken.create({
      data: { userId: user.id, expiresAt },
    });
    if (process.env.NODE_ENV !== 'production') {
      return res.json({ ...response, token: record.token });
    }
  }

  res.json(response);
}

export async function passwordResetConfirm(req, res) {
  const { token, new_password, new_password_confirm } = req.body || {};

  if (!token) throw badRequest({ token: ['This field is required.'] });
  if (!new_password) throw badRequest({ new_password: ['This field is required.'] });
  if (new_password !== new_password_confirm) {
    throw badRequest({ new_password_confirm: ["Passwords don't match."] });
  }
  if (String(new_password).length < 8) {
    throw badRequest({ new_password: ['Password must be at least 8 characters long.'] });
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.isUsed || record.expiresAt.getTime() < Date.now()) {
    throw badRequest({ detail: 'Invalid or expired token.' });
  }

  const hashed = await hashPassword(new_password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: hashed } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { isUsed: true } }),
    prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  res.json({ detail: 'Password reset successful' });
}

export async function getProfile(req, res) {
  const user = await loadUserWithProfile(req.user.id);
  res.json(serializeUser(user));
}

export async function updateProfile(req, res) {
  const { first_name, last_name, profile } = req.body || {};

  const userData = {};
  if (first_name !== undefined) userData.firstName = first_name;
  if (last_name !== undefined) userData.lastName = last_name;

  const profileData = {};
  if (profile && typeof profile === 'object') {
    if (profile.avatar_url !== undefined) profileData.avatarUrl = profile.avatar_url;
    if (profile.currency !== undefined) profileData.currency = profile.currency;
    if (profile.timezone !== undefined) profileData.timezone = profile.timezone;
    if (profile.theme !== undefined) profileData.theme = profile.theme;
  }

  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...userData,
      profile: {
        upsert: {
          create: profileData,
          update: profileData,
        },
      },
    },
  });

  const user = await loadUserWithProfile(req.user.id);
  res.json(serializeUser(user));
}

export async function changePassword(req, res) {
  const { current_password, new_password, new_password_confirm } = req.body || {};

  if (!current_password) throw badRequest({ current_password: ['This field is required.'] });
  if (!(await verifyPassword(current_password, req.user.password))) {
    throw badRequest({ current_password: ['Current password is incorrect.'] });
  }
  if (new_password !== new_password_confirm) {
    throw badRequest({ new_password_confirm: ["Passwords don't match."] });
  }
  if (String(new_password || '').length < 8) {
    throw badRequest({ new_password: ['Password must be at least 8 characters long.'] });
  }

  const hashed = await hashPassword(new_password);
  await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });

  res.json({ detail: 'Password changed successfully' });
}
