import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import * as ctrl from './recurring.controller.js';

export const recurringRouter = Router();

recurringRouter.use(requireAuth);
recurringRouter.get('/', asyncHandler(ctrl.list));
recurringRouter.post('/', asyncHandler(ctrl.create));
recurringRouter.patch('/:id', asyncHandler(ctrl.update));
recurringRouter.put('/:id', asyncHandler(ctrl.update));
recurringRouter.delete('/:id', asyncHandler(ctrl.remove));
