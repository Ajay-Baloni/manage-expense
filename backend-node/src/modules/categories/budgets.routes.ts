import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import * as ctrl from './budgets.controller.js';

export const budgetsRouter = Router();

budgetsRouter.use(requireAuth);
budgetsRouter.get('/current-month', asyncHandler(ctrl.currentMonth));
budgetsRouter.get('/', asyncHandler(ctrl.list));
budgetsRouter.post('/', asyncHandler(ctrl.create));
budgetsRouter.patch('/:id', asyncHandler(ctrl.update));
budgetsRouter.put('/:id', asyncHandler(ctrl.update));
budgetsRouter.delete('/:id', asyncHandler(ctrl.remove));
