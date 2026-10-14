/**
 * Google Drive Backup & Disaster Recovery Types (SPEC-07)
 * Authoritative SSOT: specs/SPEC-07-google-drive-backup-recovery.md
 */

export interface DriveStatusDto {
  isConnected: boolean;
  email: string | null;
  scope: string;
  lastBackupAt: string | null;
}

export interface BackupRecordDto {
  id: string;
  telegramAccountId: string;
  provider: string;
  driveFileId: string;
  backupFormatVersion: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  profilesCount: number;
  tagsCount: number;
  metadata?: {
    fileName?: string;
    sizeBytes?: number;
    isEncryptedWithPassphrase?: boolean;
  } | null;
  createdAt: string;
}

export interface BackupPreviewDto {
  backupId: string;
  formatVersion: string;
  exportedAt: string;
  telegramUserId: string;
  profilesCount: number;
  tagsCount: number;
  newProfilesCount: number;
  matchingProfilesCount: number;
  previewProfiles: Array<{
    name: string;
    company: string | null;
    tags: string[];
  }>;
}

export interface RestoreResultDto {
  success: boolean;
  restoredProfilesCount: number;
  restoredTagsCount: number;
  restoredAt: string;
}
