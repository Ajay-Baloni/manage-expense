import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import * as ctrl from './splitExpenses.controller.js';

export const splitExpensesRouter = Router();

splitExpensesRouter.use(requireAuth);
splitExpensesRouter.get('/', asyncHandler(ctrl.list));
splitExpensesRouter.post('/', asyncHandler(ctrl.create));
splitExpensesRouter.delete('/:id', asyncHandler(ctrl.remove));
