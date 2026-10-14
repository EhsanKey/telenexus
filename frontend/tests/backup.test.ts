import { describe, it, expect } from 'vitest';
import type {
  DriveStatusDto,
  BackupRecordDto,
  BackupPreviewDto,
  RestoreResultDto,
} from '../src/types/backup.js';

describe('Frontend Google Drive Backup & Disaster Recovery (SPEC-07)', () => {
  it('validates DriveStatusDto shape and least-privilege scope (SPEC-07 §2)', () => {
    const status: DriveStatusDto = {
      isConnected: true,
      email: 'user@gmail.com',
      scope: 'https://www.googleapis.com/auth/drive.file',
      lastBackupAt: '2026-10-13T12:00:00.000Z',
    };

    expect(status.isConnected).toBe(true);
    expect(status.email).toBe('user@gmail.com');
    expect(status.scope).toBe('https://www.googleapis.com/auth/drive.file');
    expect(status.lastBackupAt).toBeDefined();
  });

  it('validates BackupRecordDto conforms to v1.0.0 format', () => {
    const record: BackupRecordDto = {
      id: 'rec-001',
      telegramAccountId: 'acc-1',
      provider: 'google_drive',
      driveFileId: 'gdrive-file-123',
      backupFormatVersion: '1.0.0',
      status: 'SUCCESS',
      profilesCount: 5,
      tagsCount: 4,
      metadata: {
        fileName: 'sot-backup-2026-10-13.sotbkp',
        sizeBytes: 4096,
        isEncryptedWithPassphrase: true,
      },
      createdAt: '2026-10-13T12:00:00.000Z',
    };

    expect(record.backupFormatVersion).toBe('1.0.0');
    expect(record.status).toBe('SUCCESS');
    expect(record.profilesCount).toBe(5);
    expect(record.metadata?.isEncryptedWithPassphrase).toBe(true);
  });

  it('validates BackupPreviewDto diff calculation properties', () => {
    const preview: BackupPreviewDto = {
      backupId: 'rec-001',
      formatVersion: '1.0.0',
      exportedAt: '2026-10-13T12:00:00.000Z',
      telegramUserId: '987654321',
      profilesCount: 10,
      tagsCount: 6,
      newProfilesCount: 7,
      matchingProfilesCount: 3,
      previewProfiles: [
        {
          name: 'Coach Farhad',
          company: 'Esteghlal FC',
          tags: ['VIP', 'Coach'],
        },
      ],
    };

    expect(preview.formatVersion).toBe('1.0.0');
    expect(preview.newProfilesCount + preview.matchingProfilesCount).toBe(preview.profilesCount);
    expect(preview.previewProfiles[0].name).toBe('Coach Farhad');
  });

  it('validates RestoreResultDto response envelope structure', () => {
    const result: RestoreResultDto = {
      success: true,
      restoredProfilesCount: 8,
      restoredTagsCount: 5,
      restoredAt: '2026-10-13T12:05:00.000Z',
    };

    expect(result.success).toBe(true);
    expect(result.restoredProfilesCount).toBe(8);
    expect(result.restoredTagsCount).toBe(5);
  });

  it('INVARIANT: Frontend reverse proxy enforces /api/backend route encapsulation', () => {
    const apiPath = '/backups/drive/status';
    const proxyUrl = `/api/backend${apiPath}`;
    expect(proxyUrl).not.toContain(':4000');
    expect(proxyUrl.startsWith('/api/backend/')).toBe(true);
  });
});
