import { Router } from 'express';
import {
  getDialogsController,
  refreshEntityController,
  getMessagesController,
} from './controller.js';

export const telegramRouter = Router();

telegramRouter.get('/dialogs', getDialogsController);
telegramRouter.get('/dialogs/:peerId/messages', getMessagesController);
telegramRouter.post('/refresh/:entityId', refreshEntityController);
