import express, { type Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

import { authRouter } from './modules/auth/auth.routes.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { budgetsRouter } from './modules/categories/budgets.routes.js';
import { transactionsRouter } from './modules/transactions/transactions.routes.js';
import { tagsRouter } from './modules/transactions/tags.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';
import { assistantRouter } from './modules/assistant/assistant.routes.js';

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/budgets', budgetsRouter);
  app.use('/api/transactions', transactionsRouter);
  app.use('/api/tags', tagsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/assistant', assistantRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
