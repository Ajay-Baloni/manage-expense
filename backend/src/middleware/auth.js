import prisma from '../config/prisma.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { unauthorized } from './error.js';

/**
 * Authentication middleware. Verifies the access JWT from the
 * Authorization: Bearer <token> header and loads req.user.
 */
export async function authenticate(req, res, next) {
  const header = req.headers.authorization || req.headers.Authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(unauthorized());
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return next(unauthorized());
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    return next(unauthorized('Given token not valid for any token type'));
  }

  const userId = payload.sub;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user || !user.isActive) {
    return next(unauthorized('User not found or inactive.'));
  }

  req.user = user;
  next();
}
