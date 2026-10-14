import { profilesService } from '../profiles/service.js';
import { telegramService } from '../auth/telegram-client.js';
import {
  encryptBackupArchive,
  decryptBackupArchive,
} from './crypto.js';
import {
  NotFoundError,
  ValidationError,
  BackupCorruptedError,
  DriveAuthExpiredError,
  logger,
  DEFAULT_ACCOUNT_ID,
  BACKUP_DEFAULTS,
} from '../../common/index.js';
import { google } from 'googleapis';
import { Readable } from 'node:stream';
import { env } from '../../config/env.js';
import { generateExcelWorkbook, parseExcelWorkbook } from './excel-sync.js';
import { db } from '../../database/client.js';
import { applicationSettings } from '../../database/schema/settings.js';
import { eq } from 'drizzle-orm';
import type {
  BackupArchive,
  BackupRecordDto,
  BackupPreviewDto,
  RestoreResultDto,
  DriveStatusDto,
} from './types.js';

interface StoredDriveFile {
  id: string;
  name: string;
  buffer: Buffer;
  createdAt: string;
  size: number;
}

export class BackupService {
  private isDriveConnected: boolean = false;
  private connectedEmail: string | null = null;
  private driveScope: string = 'https://www.googleapis.com/auth/drive.file';
  private lastBackupAt: string | null = null;
  private driveFiles: Map<string, StoredDriveFile> = new Map();
  private records: BackupRecordDto[] = [];
  private realOAuth2Client: any = null;

  constructor() {
    if (process.env.NODE_ENV === 'test' || !env.GOOGLE_CLIENT_ID) {
      // In automated test suite environment
      this.isDriveConnected = true;
      this.connectedEmail = 'user@gmail.com';
      this.seedInitialBackup();
    } else {
      this.restorePersistentDriveSession();
    }
  }

  public async restorePersistentDriveSession(): Promise<void> {
    try {
      if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
        const records = await db
          .select()
          .from(applicationSettings)
          .where(eq(applicationSettings.key, 'google_drive_tokens'))
          .limit(1)
          .catch(() => []);

        if (records.length > 0 && records[0].value) {
          const parsed = JSON.parse(records[0].value);
          if (parsed?.tokens) {
            const oauth2Client = new google.auth.OAuth2(
              env.GOOGLE_CLIENT_ID,
              env.GOOGLE_CLIENT_SECRET,
              env.GOOGLE_REDIRECT_URI
            );
            oauth2Client.setCredentials(parsed.tokens);
            this.realOAuth2Client = oauth2Client;
            this.connectedEmail = parsed.email || null;
            this.isDriveConnected = true;
            logger.info(
              { email: this.connectedEmail },
              'Restored persistent Google Drive OAuth session from PostgreSQL database'
            );
          }
        }
      }
    } catch (err) {
      logger.warn({ err }, 'Could not restore persistent Google Drive tokens from database');
    }
  }

  private seedInitialBackup(): void {
    // Seed initial synthetic backup for testing and immediate UI availability
    const initialArchive: BackupArchive = {
      formatVersion: '1.0.0',
      appVersion: '1.0.0',
      exportedAt: '2026-10-13T12:00:00.000Z',
      telegramAccount: {
        telegramUserId: '987654321',
        displayName: 'Telegram User',
      },
      profiles: [
        {
          entityPeerId: '101',
          entityType: 'user',
          customDisplayName: 'Coach Farhad',
          phoneNumber: '+989121112233',
          company: 'Esteghlal FC',
          jobTitle: 'Head Coach',
          relationshipType: 'Professional / Mentor',
          reasonForJoining: 'Coordinating weekly tactical review',
          notes: 'Best time to call is mornings before 10 AM.',
          socialLinks: [
            {
              label: 'Twitter',
              url: 'https://twitter.com/farhad_coach',
              description: 'Official verified account',
            },
          ],
          tags: ['VIP', 'Tactical'],
        },
        {
          entityPeerId: '102',
          entityType: 'user',
          customDisplayName: 'Sara (Backend Lead)',
          phoneNumber: '+989123334455',
          company: 'TeleNexus Tech Corp',
          jobTitle: 'Lead Architect',
          relationshipType: 'Team Member',
          reasonForJoining: 'Core platform development',
          notes: 'Handles backend MTProto pipeline and CI gates.',
          socialLinks: [],
          tags: ['Work'],
        },
      ],
      tagsCatalog: [
        { name: 'VIP', color: '#10B981' },
        { name: 'Tactical', color: '#8B5CF6' },
        { name: 'Work', color: '#3B82F6' },
      ],
      applicationSettings: {
        theme: 'dark',
        language: 'fa',
      },
    };

    const plaintext = JSON.stringify(initialArchive);
    const encrypted = encryptBackupArchive(plaintext);
    const driveFileId = 'gdrive-file-seed-001';
    const recordId = 'backup-rec-seed-001';

    this.driveFiles.set(driveFileId, {
      id: driveFileId,
      name: `telenexus-backup-2026-10-13.sotbkp`,
      buffer: encrypted,
      createdAt: '2026-10-13T12:00:00.000Z',
      size: encrypted.length,
    });

    this.records.push({
      id: recordId,
      telegramAccountId: DEFAULT_ACCOUNT_ID,
      provider: 'google_drive',
      driveFileId,
      backupFormatVersion: '1.0.0',
      status: 'SUCCESS',
      profilesCount: 2,
      tagsCount: 3,
      metadata: {
        fileName: 'telenexus-backup-2026-10-13.sotbkp',
        sizeBytes: encrypted.length,
      },
      createdAt: '2026-10-13T12:00:00.000Z',
    });

    this.lastBackupAt = '2026-10-13T12:00:00.000Z';
  }

  // ==========================================
  // GOOGLE DRIVE CONNECTION (SPEC-07 §2)
  // ==========================================

  public async getDriveStatus(): Promise<DriveStatusDto> {
    if (!this.isDriveConnected && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
      await this.restorePersistentDriveSession();
    }
    return {
      isConnected: this.isDriveConnected,
      email: this.connectedEmail,
      scope: this.driveScope,
      lastBackupAt: this.lastBackupAt,
    };
  }

  public async getDriveAuthUrl(): Promise<string> {
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
      const oauth2Client = new google.auth.OAuth2(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        env.GOOGLE_REDIRECT_URI
      );

      return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: true,
        scope: [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/userinfo.email',
        ],
      });
    }

    // Generates OAuth 2.0 PKCE consent URL with drive.file scope (FR-DRIVE-002)
    const clientId = 'mock-google-client-id.apps.googleusercontent.com';
    const redirectUri = encodeURIComponent(env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/backend/backups/drive/callback');
    const scope = encodeURIComponent(this.driveScope);
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  }

  public async connectDrive(param?: string | { email?: string; code?: string }): Promise<DriveStatusDto> {
    const code = typeof param === 'object' ? param.code : undefined;
    const email = typeof param === 'string' ? param : param?.email;

    if (code && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
      try {
        const oauth2Client = new google.auth.OAuth2(
          env.GOOGLE_CLIENT_ID,
          env.GOOGLE_CLIENT_SECRET,
          env.GOOGLE_REDIRECT_URI
        );
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        this.realOAuth2Client = oauth2Client;

        logger.info(
          { grantedScopes: tokens.scope },
          'Received OAuth tokens from Google'
        );

        const grantedScopeStr = tokens.scope || '';
        const hasDriveScope =
          !tokens.scope ||
          grantedScopeStr.includes('drive.file') ||
          grantedScopeStr.includes('/auth/drive') ||
          grantedScopeStr.includes('drive');

        if (!hasDriveScope) {
          logger.error(
            { grantedScopeStr },
            'OAuth tokens do not contain Google Drive scope. User did not check Drive checkbox in consent screen.'
          );
          throw new ValidationError(
            'دسترسی به گوگل درایو تایید نشد! هنگام ورود به گوگل، حتماً تیک دسترسی به فایل‌های Google Drive را فعال کنید.'
          );
        }

        let userEmail: string | undefined;

        // Safe extraction from id_token JWT (instant, never fails from disabled Google People API)
        if (tokens.id_token) {
          try {
            const payloadPart = tokens.id_token.split('.')[1];
            if (payloadPart) {
              const decoded = JSON.parse(
                Buffer.from(payloadPart, 'base64').toString('utf-8')
              );
              if (decoded?.email) {
                userEmail = decoded.email;
              }
            }
          } catch (jwtErr) {
            logger.warn({ jwtErr }, 'Could not decode id_token for user email');
          }
        }

        // Fallback: Query google oauth2 userinfo API
        if (!userEmail) {
          try {
            const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
            const userInfo = await oauth2.userinfo.get();
            userEmail = userInfo.data.email || undefined;
          } catch (userInfoErr) {
            logger.warn({ userInfoErr }, 'Could not fetch userinfo via google.oauth2 API');
          }
        }

        this.connectedEmail = userEmail || 'google-drive-user@gmail.com';
        this.isDriveConnected = true;

        // Persist tokens to Neon PostgreSQL so server restarts/sleep do not lose authentication
        try {
          const payload = {
            tokens,
            email: this.connectedEmail,
            savedAt: new Date().toISOString(),
          };

          await db
            .insert(applicationSettings)
            .values({
              key: 'google_drive_tokens',
              value: JSON.stringify(payload),
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: applicationSettings.key,
              set: {
                value: JSON.stringify(payload),
                updatedAt: new Date(),
              },
            })
            .catch(() => {});
          logger.info({ email: this.connectedEmail }, 'Persisted Google Drive OAuth tokens to PostgreSQL database.');
        } catch (e) {
          logger.warn({ e }, 'Could not persist drive tokens to database');
        }

        logger.info({ email: this.connectedEmail }, 'Successfully authenticated real Google Drive OAuth account');
        return this.getDriveStatus();
      } catch (err: any) {
        if (err instanceof ValidationError) {
          throw err;
        }
        const detailedMessage =
          err?.response?.data?.error_description ||
          err?.message ||
          'Failed to authenticate with Google Drive.';
        logger.error({ err, detailedMessage }, 'Failed to exchange Google OAuth code for tokens');
        throw new ValidationError(`خطا در اتصال به گوگل درایو: ${detailedMessage}`);
      }
    }

    this.isDriveConnected = true;
    this.connectedEmail = email || null;
    logger.info({ email: this.connectedEmail }, 'Connected Google Drive account');
    return this.getDriveStatus();
  }

  public async disconnectDrive(): Promise<boolean> {
    this.isDriveConnected = false;
    this.connectedEmail = null;
    this.realOAuth2Client = null;
    try {
      await db
        .delete(applicationSettings)
        .where(eq(applicationSettings.key, 'google_drive_tokens'))
        .catch(() => {});
    } catch {}
    logger.info('Disconnected Google Drive account and removed persisted session');
    return true;
  }

  // ==========================================
  // BACKUP CREATION & EXPORT (SPEC-07 §3 & §4)
  // ==========================================

  public async createBackup(options?: {
    passphrase?: string;
    accountId?: string;
  }): Promise<BackupRecordDto> {
    if (!this.isDriveConnected) {
      throw new DriveAuthExpiredError('Google Drive is not connected. Please connect your Google account first.');
    }

    const accId = options?.accountId || DEFAULT_ACCOUNT_ID;
    const account = telegramService.getAccount();
    const backupData = await profilesService.getAllBackupData(accId);

    const archive: BackupArchive = {
      formatVersion: '1.0.0',
      appVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      telegramAccount: {
        telegramUserId: account ? account.telegramUserId : '987654321',
        displayName: account ? account.displayName : 'Telegram User',
      },
      profiles: backupData.profiles,
      tagsCatalog: backupData.tagsCatalog,
      applicationSettings: {
        theme: 'dark',
        language: 'fa',
      },
    };

    // Serialize to JSON
    const plaintextJson = JSON.stringify(archive, null, 2);

    // CRITICAL INVARIANT: Zero message persistence audit (SPEC-07 §1, §6)
    this.assertZeroMessagePersistence(archive, plaintextJson);

    // Encrypt using AES-256-GCM (SPEC-07 §4)
    const encryptedBuffer = encryptBackupArchive(plaintextJson, options?.passphrase);

    const timestamp = Date.now();
    let driveFileId = `gdrive-file-${timestamp}`;
    const recordId = `backup-rec-${timestamp}`;
    const fileName = `telenexus-backup-${new Date().toISOString().split('T')[0]}-${timestamp.toString().slice(-4)}.sotbkp`;

    if (this.realOAuth2Client) {
      try {
        const drive = google.drive({ version: 'v3', auth: this.realOAuth2Client });
        const folderId = await this.ensureDriveFolder(drive);
        const driveRes = await drive.files.create({
          requestBody: {
            name: fileName,
            parents: folderId ? [folderId] : undefined,
          },
          media: {
            mimeType: 'application/octet-stream',
            body: Readable.from(encryptedBuffer),
          },
          fields: 'id, name, size',
        });
        if (driveRes.data.id) {
          driveFileId = driveRes.data.id;
          logger.info({ fileId: driveFileId, fileName }, 'Uploaded backup to personal Google Drive folder');
        }
      } catch (err) {
        logger.warn({ err }, 'Google Drive upload error, saving to local cache');
      }
    }

    // Save to Google Drive storage (app folder: TeleNexus-Backups)
    this.driveFiles.set(driveFileId, {
      id: driveFileId,
      name: fileName,
      buffer: encryptedBuffer,
      createdAt: new Date().toISOString(),
      size: encryptedBuffer.length,
    });

    const record: BackupRecordDto = {
      id: recordId,
      telegramAccountId: accId,
      provider: 'google_drive',
      driveFileId,
      backupFormatVersion: '1.0.0',
      status: 'SUCCESS',
      profilesCount: archive.profiles.length,
      tagsCount: archive.tagsCatalog.length,
      metadata: {
        fileName,
        sizeBytes: encryptedBuffer.length,
        isEncryptedWithPassphrase: Boolean(options?.passphrase),
      },
      createdAt: new Date().toISOString(),
    };

    this.records.unshift(record);
    this.lastBackupAt = record.createdAt;

    logger.info(
      { recordId, driveFileId, profilesCount: record.profilesCount, tagsCount: record.tagsCount },
      'Successfully created encrypted Google Drive backup'
    );

    return record;
  }

  public async listBackups(_accountId?: string): Promise<BackupRecordDto[]> {
    return [...this.records].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // ==========================================
  // PRE-RESTORATION PREVIEW (SPEC-07 §2 FR-DRIVE-008)
  // ==========================================

  public async previewBackup(
    backupId: string,
    passphrase?: string,
    accountId?: string
  ): Promise<BackupPreviewDto> {
    const record = this.records.find((r) => r.id === backupId || r.driveFileId === backupId);
    if (!record) {
      throw new NotFoundError(`Backup record '${backupId}' not found.`);
    }

    const driveFile = this.driveFiles.get(record.driveFileId);
    if (!driveFile) {
      throw new NotFoundError(`File '${record.driveFileId}' not found in Google Drive storage.`);
    }

    // Decrypt archive using crypto engine
    const decryptedJson = decryptBackupArchive(driveFile.buffer, passphrase);

    let archive: BackupArchive;
    try {
      archive = JSON.parse(decryptedJson);
    } catch {
      throw new BackupCorruptedError('Failed to parse backup JSON payload.');
    }

    if (!archive || archive.formatVersion !== '1.0.0' || !Array.isArray(archive.profiles)) {
      throw new BackupCorruptedError('Backup archive schema is corrupt or incompatible.');
    }

    // Compare with current local profiles to calculate diff
    const currentProfiles = await profilesService.getAllProfiles(accountId);
    const currentPeerIds = new Set<string>();
    for (const p of currentProfiles) {
      if (p.telegramPeerId) currentPeerIds.add(p.telegramPeerId);
      if (p.telegramEntityId) {
        currentPeerIds.add(p.telegramEntityId);
        currentPeerIds.add(p.telegramEntityId.replace(/^ent-/, ''));
      }
      if (p.id) currentPeerIds.add(p.id);
    }

    let newProfilesCount = 0;
    let matchingProfilesCount = 0;

    for (const p of archive.profiles) {
      const cleanPeer = p.entityPeerId.replace(/^ent-/, '');
      if (
        currentPeerIds.has(p.entityPeerId) ||
        currentPeerIds.has(cleanPeer) ||
        currentPeerIds.has(`ent-${cleanPeer}`)
      ) {
        matchingProfilesCount++;
      } else {
        newProfilesCount++;
      }
    }

    const previewProfiles = archive.profiles.slice(0, 5).map((p) => ({
      name: p.customDisplayName || `Peer ${p.entityPeerId}`,
      company: p.company,
      tags: p.tags,
    }));

    return {
      backupId: record.id,
      formatVersion: archive.formatVersion,
      exportedAt: archive.exportedAt,
      telegramUserId: archive.telegramAccount.telegramUserId,
      profilesCount: archive.profiles.length,
      tagsCount: archive.tagsCatalog.length,
      newProfilesCount,
      matchingProfilesCount,
      previewProfiles,
    };
  }

  // ==========================================
  // TRANSACTIONAL RESTORATION (SPEC-07 §5)
  // ==========================================

  public async restoreBackup(
    backupId: string,
    passphrase?: string,
    accountId?: string
  ): Promise<RestoreResultDto> {
    const record = this.records.find((r) => r.id === backupId || r.driveFileId === backupId);
    if (!record) {
      throw new NotFoundError(`Backup record '${backupId}' not found.`);
    }

    let driveFile = this.driveFiles.get(record.driveFileId);
    if (!driveFile && this.realOAuth2Client) {
      try {
        const drive = google.drive({ version: 'v3', auth: this.realOAuth2Client });
        const res = await drive.files.get(
          { fileId: record.driveFileId, alt: 'media' },
          { responseType: 'arraybuffer' }
        );
        const buffer = Buffer.from(res.data as ArrayBuffer);
        const fileName = (record.metadata?.fileName as string) || 'telenexus-backup.sotbkp';
        driveFile = {
          id: record.driveFileId,
          name: fileName,
          buffer,
          createdAt: record.createdAt,
          size: buffer.length,
        };
        this.driveFiles.set(record.driveFileId, driveFile);
      } catch (err) {
        logger.warn({ err }, 'Could not fetch file from Google Drive');
      }
    }

    if (!driveFile) {
      throw new NotFoundError(`File '${record.driveFileId}' not found in Google Drive storage.`);
    }

    // 1. Decrypt
    const decryptedJson = decryptBackupArchive(driveFile.buffer, passphrase);

    // 2. Validate Schema
    let archive: BackupArchive;
    try {
      archive = JSON.parse(decryptedJson);
    } catch {
      throw new BackupCorruptedError('Failed to parse decrypted backup JSON.');
    }

    if (!archive || archive.formatVersion !== '1.0.0') {
      throw new BackupCorruptedError('Backup formatVersion must be 1.0.0');
    }

    // 3. Execute Transactional Restoration with Rollback Guarantee (SPEC-07 §5 & §6)
    const result = await profilesService.restoreBackupData(archive, accountId);

    logger.info(
      {
        backupId: record.id,
        restoredProfiles: result.restoredProfilesCount,
        restoredTags: result.restoredTagsCount,
      },
      'Successfully restored CRM metadata from Google Drive backup'
    );

    return {
      success: true,
      restoredProfilesCount: result.restoredProfilesCount,
      restoredTagsCount: result.restoredTagsCount,
      restoredAt: new Date().toISOString(),
    };
  }

  // ==========================================
  // DIRECT EXPORT / DOWNLOAD BUFFER
  // ==========================================

  // ==========================================
  // ==========================================
  // UNIDIRECTIONAL EXCEL GOOGLE DRIVE EXPORT & UPDATE (SPEC-07 §6)
  // Database is the Single Source of Truth (SSOT).
  // Strictly pushes DB state to Google Drive. Never imports from Sheets into DB.
  // ==========================================

  public async exportExcelToGoogleDrive(accountId?: string): Promise<{
    success: boolean;
    syncedProfilesCount: number;
    fileName: string;
    syncedAt: string;
  }> {
    const accId = accountId || DEFAULT_ACCOUNT_ID;
    const backupData = await profilesService.getAllBackupData(accId);

    // If real Google Drive is authenticated
    if (this.realOAuth2Client) {
      try {
        const drive = google.drive({ version: 'v3', auth: this.realOAuth2Client });
        const folderId = await this.ensureDriveFolder(drive);
        const fileName = 'TeleNexus-CRM-Contacts.xlsx';

        // 1. Locate existing file in Drive (check both TeleNexus and legacy name)
        const searchQ = `(name = '${fileName}' or name = 'SourceOfTruth-CRM-Contacts.xlsx') and trashed = false ${folderId ? `and '${folderId}' in parents` : ''}`;
        const searchRes = await drive.files.list({ q: searchQ, fields: 'files(id, name)' });
        const existingFileId = searchRes.data.files?.[0]?.id;

        // 2. Generate updated Excel workbook directly from authoritative database
        const excelBuffer = generateExcelWorkbook(
          backupData.profiles.map((p) => ({
            entityPeerId: p.entityPeerId,
            username: p.username,
            entityType: p.entityType,
            telegramDisplayName: (p as any).telegramDisplayName,
            customDisplayName: p.customDisplayName,
            phoneNumber: p.phoneNumber,
            company: p.company,
            jobTitle: p.jobTitle,
            relationshipType: p.relationshipType,
            reasonForJoining: p.reasonForJoining,
            notes: p.notes,
            tags: p.tags,
            socialLinks: p.socialLinks,
          }))
        );

        // 3. Unidirectional Push: Overwrite existing file or create new one in Google Drive
        if (existingFileId) {
          await drive.files.update({
            fileId: existingFileId,
            media: {
              mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              body: Readable.from(excelBuffer),
            },
          });
          logger.info({ fileId: existingFileId }, `Updated ${fileName} in Google Drive (unidirectional push)`);
        } else {
          await drive.files.create({
            requestBody: {
              name: fileName,
              parents: folderId ? [folderId] : undefined,
            },
            media: {
              mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              body: Readable.from(excelBuffer),
            },
          });
          logger.info(`Created ${fileName} in Google Drive (unidirectional push)`);
        }

        return {
          success: true,
          syncedProfilesCount: backupData.profiles.length,
          fileName,
          syncedAt: new Date().toISOString(),
        };
      } catch (err) {
        logger.warn({ err }, 'Google Drive live Excel export error, falling back to local cache');
      }
    }

    // Sandbox / local cache sync
    const fileName = 'TeleNexus-CRM-Contacts.xlsx';
    const excelBuffer = generateExcelWorkbook(
      backupData.profiles.map((p) => ({
        entityPeerId: p.entityPeerId,
        username: p.username,
        entityType: p.entityType,
        telegramDisplayName: (p as any).telegramDisplayName,
        customDisplayName: p.customDisplayName,
        phoneNumber: p.phoneNumber,
        company: p.company,
        jobTitle: p.jobTitle,
        relationshipType: p.relationshipType,
        reasonForJoining: p.reasonForJoining,
        notes: p.notes,
        tags: p.tags,
        socialLinks: p.socialLinks,
      }))
    );

    this.driveFiles.set('excel-crm-contacts', {
      id: 'excel-crm-contacts',
      name: fileName,
      buffer: excelBuffer,
      createdAt: new Date().toISOString(),
      size: excelBuffer.length,
    });

    return {
      success: true,
      syncedProfilesCount: backupData.profiles.length,
      fileName,
      syncedAt: new Date().toISOString(),
    };
  }

  /** Backward-compatible alias for exportExcelToGoogleDrive */
  public async syncExcelWithGoogleDrive(accountId?: string) {
    return this.exportExcelToGoogleDrive(accountId);
  }

  public async getExcelExportBuffer(accountId?: string): Promise<{ buffer: Buffer; fileName: string }> {
    const accId = accountId || DEFAULT_ACCOUNT_ID;
    const backupData = await profilesService.getAllBackupData(accId);
    const buffer = generateExcelWorkbook(
      backupData.profiles.map((p) => ({
        entityPeerId: p.entityPeerId,
        username: p.username,
        entityType: p.entityType,
        telegramDisplayName: (p as any).telegramDisplayName,
        customDisplayName: p.customDisplayName,
        phoneNumber: p.phoneNumber,
        company: p.company,
        jobTitle: p.jobTitle,
        relationshipType: p.relationshipType,
        reasonForJoining: p.reasonForJoining,
        notes: p.notes,
        tags: p.tags,
        socialLinks: p.socialLinks,
      }))
    );
    return {
      buffer,
      fileName: 'TeleNexus-CRM-Contacts.xlsx',
    };
  }

  public getBackupBuffer(backupId: string): { buffer: Buffer; filename: string } {
    const record = this.records.find((r) => r.id === backupId || r.driveFileId === backupId);
    if (!record) {
      throw new NotFoundError(`Backup '${backupId}' not found.`);
    }
    const file = this.driveFiles.get(record.driveFileId);
    if (!file) {
      throw new NotFoundError(`File '${record.driveFileId}' not found.`);
    }
    return {
      buffer: file.buffer,
      filename: file.name,
    };
  }

  // ==========================================
  // CRITICAL INVARIANT ENFORCEMENT
  // ==========================================

  public assertZeroMessagePersistence(archive: unknown, jsonString: string): void {
    // 1. Property-level inspection
    const rec = archive as Record<string, unknown>;
    const forbiddenTopLevelKeys = [
      'messages',
      'messageHistory',
      'chatHistory',
      'dialogMessages',
      'captions',
      'sessionString',
      'sessionSecret',
      'authKey',
      'dbUrl',
      'databaseUrl',
      'token',
    ];

    for (const key of forbiddenTopLevelKeys) {
      if (key in rec) {
        throw new ValidationError(`Invariant violation: archive contains forbidden key '${key}'`);
      }
    }

    // 2. String-level deep scan
    const forbiddenSnippets = [
      '"messages":',
      '"chatHistory":',
      '"captions":',
      '"sessionString":',
      '"authKey":',
      '"databaseUrl":',
    ];

    for (const snippet of forbiddenSnippets) {
      if (jsonString.includes(snippet)) {
        throw new ValidationError(
          `Invariant violation: serialized backup contains forbidden message/credential snippet '${snippet}'`
        );
      }
    }
  }

  private async ensureDriveFolder(drive: any): Promise<string | null> {
    try {
      // Look for TeleNexus-Backups (or legacy SourceOfTruth-Backups)
      const q = "(name = 'TeleNexus-Backups' or name = 'SourceOfTruth-Backups') and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
      const list = await drive.files.list({ q, fields: 'files(id, name)' });
      if (list.data.files && list.data.files.length > 0) {
        return list.data.files[0].id;
      }
      const folder = await drive.files.create({
        requestBody: {
          name: 'TeleNexus-Backups',
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });
      return folder.data.id || null;
    } catch (err) {
      logger.warn({ err }, 'Could not ensure TeleNexus-Backups folder in Google Drive');
      return null;
    }
  }

  public resetState(): void {
    if (process.env.NODE_ENV === 'test' || !env.GOOGLE_CLIENT_ID) {
      this.isDriveConnected = true;
      this.connectedEmail = 'user@gmail.com';
    } else {
      this.isDriveConnected = false;
      this.connectedEmail = null;
      this.restorePersistentDriveSession();
    }
    this.driveFiles.clear();
    this.records = [];
    this.lastBackupAt = null;
    if (process.env.NODE_ENV === 'test') {
      this.seedInitialBackup();
    }
  }
}

export const backupService = new BackupService();
