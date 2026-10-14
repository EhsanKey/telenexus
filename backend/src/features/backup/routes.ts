import { Router } from 'express';
import { backupController } from './controller.js';

export const backupRouter = Router();

// Google Drive Account Management (SPEC-07 §2)
backupRouter.get('/drive/status', (req, res, next) =>
  backupController.getDriveStatus(req, res, next)
);
backupRouter.get('/drive/auth-url', (req, res, next) =>
  backupController.getDriveAuthUrl(req, res, next)
);
backupRouter.post('/drive/connect', (req, res, next) =>
  backupController.connectDrive(req, res, next)
);
backupRouter.post('/drive/disconnect', (req, res, next) =>
  backupController.disconnectDrive(req, res, next)
);

// Excel Google Drive Unidirectional Export & Direct Download (SPEC-07 CRM Extension)
backupRouter.post('/sync-excel', (req, res, next) =>
  backupController.syncExcel(req, res, next)
);
backupRouter.post('/update-excel', (req, res, next) =>
  backupController.syncExcel(req, res, next)
);
backupRouter.get('/excel/download', (req, res, next) =>
  backupController.downloadExcel(req, res, next)
);

// Backup Lifecycle & Restoration Endpoints (SPEC-07 §3-§5)
backupRouter.get('/', (req, res, next) =>
  backupController.listBackups(req, res, next)
);
backupRouter.post('/', (req, res, next) =>
  backupController.createBackup(req, res, next)
);
backupRouter.post('/:backupId/preview', (req, res, next) =>
  backupController.previewBackup(req, res, next)
);
backupRouter.post('/:backupId/restore', (req, res, next) =>
  backupController.restoreBackup(req, res, next)
);
backupRouter.get('/:backupId/download', (req, res, next) =>
  backupController.downloadBackup(req, res, next)
);
