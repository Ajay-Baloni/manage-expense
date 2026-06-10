import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import * as ctrl from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/register', asyncHandler(ctrl.register));
authRouter.post('/login', asyncHandler(ctrl.login));
authRouter.post('/logout', requireAuth, asyncHandler(ctrl.logout));
authRouter.post('/refresh', asyncHandler(ctrl.refresh));
authRouter.post('/password-reset', asyncHandler(ctrl.passwordResetRequest));
authRouter.post('/password-reset/confirm', asyncHandler(ctrl.passwordResetConfirm));
authRouter.post('/change-password', requireAuth, asyncHandler(ctrl.changePassword));
authRouter
  .route('/profile')
  .get(requireAuth, asyncHandler(ctrl.getProfile))
  .patch(requireAuth, asyncHandler(ctrl.updateProfile))
  .put(requireAuth, asyncHandler(ctrl.updateProfile));
