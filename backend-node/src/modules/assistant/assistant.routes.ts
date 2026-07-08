import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import * as ctrl from './assistant.controller.js';

export const assistantRouter = Router();

assistantRouter.use(requireAuth);
assistantRouter.post('/chat', asyncHandler(ctrl.chat));
assistantRouter.post('/confirm', asyncHandler(ctrl.confirm));
