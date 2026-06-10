import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import * as ctrl from './categories.controller.js';

export const categoriesRouter = Router();

categoriesRouter.use(requireAuth);
categoriesRouter.get('/', asyncHandler(ctrl.list));
categoriesRouter.post('/', asyncHandler(ctrl.create));
categoriesRouter.patch('/:id', asyncHandler(ctrl.update));
categoriesRouter.put('/:id', asyncHandler(ctrl.update));
categoriesRouter.delete('/:id', asyncHandler(ctrl.remove));
