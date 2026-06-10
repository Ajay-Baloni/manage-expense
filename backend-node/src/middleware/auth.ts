import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';

/** Verifies the Bearer access token and attaches req.user. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw AppError.unauthorized();
    }
    const token = header.slice('Bearer '.length).trim();
    let userId: string;
    try {
      userId = verifyAccessToken(token).sub;
    } catch {
      throw AppError.unauthorized('Invalid or expired token');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isActive: true },
    });
    if (!user || !user.isActive) {
      throw AppError.unauthorized('Account not found or disabled');
    }

    req.user = { id: user.id, email: user.email };
    next();
  } catch (err) {
    next(err);
  }
}
