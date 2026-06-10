import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface AccessPayload {
  sub: string;
  type: 'access';
}

export interface RefreshPayload {
  sub: string;
  type: 'refresh';
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'access' }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
  } as SignOptions);
}

export function signRefreshToken(userId: string, rememberMe = false): string {
  const expiresIn = rememberMe ? env.REFRESH_TOKEN_TTL_REMEMBER : env.REFRESH_TOKEN_TTL;
  return jwt.sign({ sub: userId, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
  if (payload.type !== 'access') throw new Error('Invalid token type');
  return payload;
}

export function verifyRefreshToken(token: string): RefreshPayload {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
  if (payload.type !== 'refresh') throw new Error('Invalid token type');
  return payload;
}
