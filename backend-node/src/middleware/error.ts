import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError.js';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ detail: 'Resource not found' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      detail: 'Validation failed',
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({ detail: err.message, ...(err.details ? { errors: err.details } : {}) });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (err.code === 'P2002') {
      res.status(409).json({ detail: 'A record with these values already exists' });
      return;
    }
    // Record not found (e.g. update/delete on missing row)
    if (err.code === 'P2025') {
      res.status(404).json({ detail: 'Not found' });
      return;
    }
  }

  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);
  res.status(500).json({ detail: 'Internal server error' });
}
