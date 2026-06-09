import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const ACCESS_EXPIRES_MIN = parseInt(process.env.JWT_ACCESS_EXPIRES_MIN || '15', 10);
const REFRESH_EXPIRES_DAYS = parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS || '7', 10);
const REFRESH_REMEMBER_DAYS = parseInt(process.env.JWT_REFRESH_REMEMBER_DAYS || '30', 10);

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, type: 'access' },
    JWT_SECRET,
    { expiresIn: `${ACCESS_EXPIRES_MIN}m` }
  );
}

export function verifyAccessToken(token) {
  const payload = jwt.verify(token, JWT_SECRET);
  if (payload.type && payload.type !== 'access') {
    throw new Error('Invalid token type');
  }
  return payload;
}

/**
 * Build a refresh token string + its expiry date.
 * The refresh token is an opaque random string stored in the RefreshToken table.
 */
export function buildRefreshToken({ remember = false } = {}) {
  const days = remember ? REFRESH_REMEMBER_DAYS : REFRESH_EXPIRES_DAYS;
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return { token, expiresAt, days };
}

export const refreshCookieMaxAgeMs = (remember = false) => {
  const days = remember ? REFRESH_REMEMBER_DAYS : REFRESH_EXPIRES_DAYS;
  return days * 24 * 60 * 60 * 1000;
};

export const config = {
  JWT_SECRET,
  ACCESS_EXPIRES_MIN,
  REFRESH_EXPIRES_DAYS,
  REFRESH_REMEMBER_DAYS,
};
