import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import * as ctrl from './splitGroups.controller.js';

export const splitGroupsRouter = Router();

splitGroupsRouter.use(requireAuth);
splitGroupsRouter.get('/', asyncHandler(ctrl.list));
splitGroupsRouter.post('/', asyncHandler(ctrl.create));
splitGroupsRouter.get('/:id', asyncHandler(ctrl.retrieve));
splitGroupsRouter.patch('/:id', asyncHandler(ctrl.update));
splitGroupsRouter.put('/:id', asyncHandler(ctrl.update));
splitGroupsRouter.delete('/:id', asyncHandler(ctrl.remove));
splitGroupsRouter.post('/:id/members', asyncHandler(ctrl.addMember));
splitGroupsRouter.get('/:id/balances', asyncHandler(ctrl.balances));
splitGroupsRouter.post('/:id/settle', asyncHandler(ctrl.settle));
