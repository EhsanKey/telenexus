import type { Request, Response, NextFunction } from 'express';
import { backupService } from './service.js';
import { createSuccessEnvelope } from '../../common/envelope.js';

export class BackupController {
  public async getDriveStatus(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const status = await backupService.getDriveStatus();
      res.status(200).json(createSuccessEnvelope(status));
    } catch (err: unknown) {
      next(err);
    }
  }

  public async getDriveAuthUrl(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authUrl = await backupService.getDriveAuthUrl();
      res.status(200).json(createSuccessEnvelope({ authUrl }));
    } catch (err: unknown) {
      next(err);
    }
  }

  public async connectDrive(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, code } = req.body as { email?: string; code?: string };
      const status = await backupService.connectDrive({ email, code });
      res.status(200).json(createSuccessEnvelope(status));
    } catch (err: unknown) {
      next(err);
    }
  }

  public async disconnectDrive(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const success = await backupService.disconnectDrive();
      res.status(200).json(createSuccessEnvelope({ disconnected: success }));
    } catch (err: unknown) {
      next(err);
    }
  }

  public async listBackups(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const backups = await backupService.listBackups();
      res.status(200).json(createSuccessEnvelope(backups));
    } catch (err: unknown) {
      next(err);
    }
  }

  public async createBackup(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { passphrase } = (req.body || {}) as { passphrase?: string };
      const record = await backupService.createBackup({ passphrase });
      res.status(201).json(createSuccessEnvelope(record));
    } catch (err: unknown) {
      next(err);
    }
  }

  public async previewBackup(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { backupId } = req.params as { backupId: string };
      const { passphrase } = (req.body || {}) as { passphrase?: string };
      const preview = await backupService.previewBackup(backupId, passphrase);
      res.status(200).json(createSuccessEnvelope(preview));
    } catch (err: unknown) {
      next(err);
    }
  }

  public async restoreBackup(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { backupId } = req.params as { backupId: string };
      const { passphrase } = (req.body || {}) as { passphrase?: string };
      const result = await backupService.restoreBackup(backupId, passphrase);
      res.status(200).json(createSuccessEnvelope(result));
    } catch (err: unknown) {
      next(err);
    }
  }

  public async downloadBackup(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { backupId } = req.params as { backupId: string };
      const file = backupService.getBackupBuffer(backupId);
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.send(file.buffer);
    } catch (err: unknown) {
      next(err);
    }
  }

  public async syncExcel(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await backupService.syncExcelWithGoogleDrive();
      res.status(200).json(createSuccessEnvelope(result));
    } catch (err: unknown) {
      next(err);
    }
  }

  public async downloadExcel(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const file = await backupService.getExcelExportBuffer();
      res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.send(file.buffer);
    } catch (err: unknown) {
      next(err);
    }
  }
}

export const backupController = new BackupController();
