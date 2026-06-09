import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes.js';
import transactionRoutes from './routes/transaction.routes.js';
import categoryRoutes from './routes/category.routes.js';
import splitRoutes from './routes/split.routes.js';
import reportRoutes from './routes/report.routes.js';
import { errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  // Trust the first proxy hop so req.protocol / host work behind a reverse
  // proxy. Using a numeric hop count (rather than `true`) keeps
  // express-rate-limit's key generation safe.
  app.set('trust proxy', 1);
  // Non-strict routing: "/foo" and "/foo/" are treated the same. The React
  // frontend always sends trailing slashes, so this keeps routes matching.
  app.set('strict routing', false);

  const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow non-browser / same-origin requests (no Origin header).
        if (!origin) return cb(null, true);
        if (!corsOrigins.length || corsOrigins.includes(origin)) {
          return cb(null, true);
        }
        return cb(null, false);
      },
      credentials: true,
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Serve uploaded receipt files.
  app.use('/uploads', express.static(new URL('../uploads', import.meta.url).pathname));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/splits', splitRoutes);
  app.use('/api/reports', reportRoutes);

  // 404 for unknown API routes.
  app.use('/api', (req, res) => {
    res.status(404).json({ detail: 'Not found.' });
  });

  app.use(errorHandler);

  return app;
}

export default createApp;
