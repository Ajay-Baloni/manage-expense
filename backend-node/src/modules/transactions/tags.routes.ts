import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import * as ctrl from './tags.controller.js';

export const tagsRouter = Router();

tagsRouter.use(requireAuth);
tagsRouter.get('/', asyncHandler(ctrl.list));
tagsRouter.post('/', asyncHandler(ctrl.create));
tagsRouter.patch('/:id', asyncHandler(ctrl.update));
tagsRouter.put('/:id', asyncHandler(ctrl.update));
tagsRouter.delete('/:id', asyncHandler(ctrl.remove));
