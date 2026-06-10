import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import * as ctrl from './transactions.controller.js';

export const transactionsRouter = Router();

transactionsRouter.use(requireAuth);
transactionsRouter.get('/dashboard-summary', asyncHandler(ctrl.dashboardSummary));
transactionsRouter.get('/', asyncHandler(ctrl.list));
transactionsRouter.post('/', asyncHandler(ctrl.create));
transactionsRouter.get('/:id', asyncHandler(ctrl.retrieve));
transactionsRouter.patch('/:id', asyncHandler(ctrl.update));
transactionsRouter.put('/:id', asyncHandler(ctrl.update));
transactionsRouter.delete('/:id', asyncHandler(ctrl.remove));
