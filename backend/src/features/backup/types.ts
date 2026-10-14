/**
 * Google Drive Backup & Disaster Recovery Types (SPEC-07)
 * Authoritative SSOT: specs/SPEC-07-google-drive-backup-recovery.md
 */

export interface BackupSocialLink {
  label: string;
  url: string;
  description: string | null;
}

export interface BackupProfile {
  entityPeerId: string;
  username?: string | null;
  entityType: 'user' | 'group' | 'supergroup' | 'channel';
  customDisplayName: string | null;
  phoneNumber: string | null;
  company: string | null;
  jobTitle: string | null;
  relationshipType: string | null;
  reasonForJoining: string | null;
  notes: string | null;
  socialLinks: BackupSocialLink[];
  tags: string[]; // Tag names
}

export interface BackupArchive {
  formatVersion: '1.0.0';
  appVersion: string;
  exportedAt: string; // ISO-8601
  telegramAccount: {
    telegramUserId: string;
    displayName: string | null;
  };
  profiles: BackupProfile[];
  tagsCatalog: Array<{
    name: string;
    color: string | null;
  }>;
  applicationSettings: Record<string, string>;
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
  metadata?: Record<string, unknown> | null;
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

export interface DriveStatusDto {
  isConnected: boolean;
  email: string | null;
  scope: string;
  lastBackupAt: string | null;
}
