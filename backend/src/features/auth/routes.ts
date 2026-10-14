import { Router } from 'express';
import {
  sendPhoneController,
  verifyCodeController,
  verifyPasswordController,
  getStatusController,
  disconnectController,
  cancelAuthController,
  getDashboardStatusController,
  setupPasscodeController,
  unlockDashboardController,
  dashboardLogoutController,
} from './controller.js';

export const authRouter = Router();

authRouter.post('/phone', sendPhoneController);
authRouter.post('/code', verifyCodeController);
authRouter.post('/password', verifyPasswordController);
authRouter.get('/status', getStatusController);
authRouter.post('/disconnect', disconnectController);
authRouter.post('/cancel', cancelAuthController);

authRouter.get('/dashboard-status', getDashboardStatusController);
authRouter.post('/setup-passcode', setupPasscodeController);
authRouter.post('/unlock', unlockDashboardController);
authRouter.post('/dashboard-logout', dashboardLogoutController);
