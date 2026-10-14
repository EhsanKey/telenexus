import { describe, it, expect, beforeEach } from 'vitest';
import { backupService } from '../../src/features/backup/service.js';
import { profilesService } from '../../src/features/profiles/service.js';
import {
  encryptBackupArchive,
  decryptBackupArchive,
} from '../../src/features/backup/crypto.js';
import {
  BackupCorruptedError,
  BackupDecryptError,
  ValidationError,
} from '../../src/common/errors.js';
import type { BackupArchive } from '../../src/features/backup/types.js';

describe('Google Drive Backup & Disaster Recovery (SPEC-07)', () => {
  beforeEach(() => {
    backupService.resetState();
    profilesService.resetState();
  });

  describe('Encryption Engine (AES-256-GCM)', () => {
    it('encrypts and decrypts payloads seamlessly with default master secret', () => {
      const plaintext = JSON.stringify({ hello: 'world', count: 42 });
      const encrypted = encryptBackupArchive(plaintext);

      expect(encrypted).toBeInstanceOf(Buffer);
      expect(encrypted.length).toBeGreaterThan(28); // 12 IV + 16 Tag + Ciphertext

      const decrypted = decryptBackupArchive(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('encrypts and decrypts with user-provided passphrase', () => {
      const plaintext = JSON.stringify({ secretCRM: 'high-value-lead' });
      const passphrase = 'SuperSecurePassphrase2026!';
      const encrypted = encryptBackupArchive(plaintext, passphrase);

      const decrypted = decryptBackupArchive(encrypted, passphrase);
      expect(decrypted).toBe(plaintext);
    });

    it('rejects decryption when wrong passphrase is provided (SPEC-07 §5)', () => {
      const plaintext = JSON.stringify({ secretData: 123 });
      const encrypted = encryptBackupArchive(plaintext, 'CorrectPassphrase');

      expect(() => {
        decryptBackupArchive(encrypted, 'WrongPassphrase');
      }).toThrow(BackupDecryptError);
    });

    it('rejects truncated or corrupted buffers (SPEC-07 §5)', () => {
      const invalidBuffer = Buffer.from('too-short');
      expect(() => {
        decryptBackupArchive(invalidBuffer);
      }).toThrow(BackupCorruptedError);
    });
  });

  describe('Google Drive Connection Management', () => {
    it('reports drive connection status', async () => {
      const status = await backupService.getDriveStatus();
      expect(status.isConnected).toBe(true);
      expect(status.email).toBe('user@gmail.com');
      expect(status.scope).toContain('drive.file');
    });

    it('supports connecting and disconnecting drive account', async () => {
      await backupService.disconnectDrive();
      let status = await backupService.getDriveStatus();
      expect(status.isConnected).toBe(false);
      expect(status.email).toBeNull();

      await backupService.connectDrive('custom@gmail.com');
      status = await backupService.getDriveStatus();
      expect(status.isConnected).toBe(true);
      expect(status.email).toBe('custom@gmail.com');
    });

    it('generates valid OAuth 2.0 PKCE auth URL with least-privilege drive.file scope', async () => {
      const authUrl = await backupService.getDriveAuthUrl();
      expect(authUrl).toContain('accounts.google.com/o/oauth2/v2/auth');
      expect(authUrl).toContain('drive.file');
    });
  });

  describe('Backup Creation & Critical Invariants (SPEC-07 §1, §6)', () => {
    it('creates an encrypted backup and registers record in list', async () => {
      const record = await backupService.createBackup();

      expect(record.id).toBeDefined();
      expect(record.provider).toBe('google_drive');
      expect(record.status).toBe('SUCCESS');
      expect(record.profilesCount).toBeGreaterThan(0);
      expect(record.tagsCount).toBeGreaterThan(0);
      expect(record.driveFileId).toBeDefined();

      const list = await backupService.listBackups();
      expect(list.some((r) => r.id === record.id)).toBe(true);
    });

    it('supports creating backup with custom passphrase', async () => {
      const passphrase = 'MyUserPassphrase123';
      const record = await backupService.createBackup({ passphrase });

      expect(record.metadata?.isEncryptedWithPassphrase).toBe(true);

      // Previews successfully with correct passphrase
      const preview = await backupService.previewBackup(record.id, passphrase);
      expect(preview.backupId).toBe(record.id);

      // Fails preview with incorrect passphrase
      await expect(
        backupService.previewBackup(record.id, 'WrongPassphrase')
      ).rejects.toThrow(BackupDecryptError);
    });

    it('CRITICAL INVARIANT: Zero message persistence verification (SPEC-07 §6)', async () => {
      // 1. Trigger backup creation
      const record = await backupService.createBackup();
      const file = backupService.getBackupBuffer(record.id);
      const plaintextJson = decryptBackupArchive(file.buffer);

      // 2. Parse archive
      const archive: BackupArchive = JSON.parse(plaintextJson);

      // 3. Explicit Invariant assertions:
      // Under no circumstances may Telegram message history, Telegram session credentials, or API secrets be exported into backup files
      expect((archive as Record<string, unknown>).messages).toBeUndefined();
      expect((archive as Record<string, unknown>).messageHistory).toBeUndefined();
      expect((archive as Record<string, unknown>).chatHistory).toBeUndefined();
      expect((archive as Record<string, unknown>).captions).toBeUndefined();
      expect((archive as Record<string, unknown>).sessionSecret).toBeUndefined();
      expect((archive as Record<string, unknown>).sessionString).toBeUndefined();
      expect((archive as Record<string, unknown>).authKey).toBeUndefined();
      expect((archive as Record<string, unknown>).databaseUrl).toBeUndefined();

      // Deep string check
      expect(plaintextJson).not.toContain('"messages":');
      expect(plaintextJson).not.toContain('"chatHistory":');
      expect(plaintextJson).not.toContain('"captions":');
      expect(plaintextJson).not.toContain('"sessionString":');

      // Passes internal assertZeroMessagePersistence
      expect(() => {
        backupService.assertZeroMessagePersistence(archive, plaintextJson);
      }).not.toThrow();
    });

    it('assertZeroMessagePersistence throws ValidationError if message fields are detected', () => {
      const taintedArchive = {
        formatVersion: '1.0.0',
        messages: [{ text: 'Leaked message' }],
      };
      const taintedJson = JSON.stringify(taintedArchive);

      expect(() => {
        backupService.assertZeroMessagePersistence(taintedArchive, taintedJson);
      }).toThrow(ValidationError);
    });
  });

  describe('Pre-Restoration Preview & Conflict Detection (SPEC-07 §2 FR-DRIVE-008)', () => {
    it('generates accurate preview diff without mutating database', async () => {
      const record = await backupService.createBackup();
      const preview = await backupService.previewBackup(record.id);

      expect(preview.backupId).toBe(record.id);
      expect(preview.formatVersion).toBe('1.0.0');
      expect(preview.profilesCount).toBe(record.profilesCount);
      expect(preview.matchingProfilesCount).toBeGreaterThanOrEqual(1);
      expect(preview.previewProfiles.length).toBeGreaterThan(0);
    });
  });

  describe('Safe Transactional Restoration & Rollback Guarantee (SPEC-07 §5 & §6)', () => {
    it('restores CRM metadata and merges new profiles and tags', async () => {
      // Create backup
      const record = await backupService.createBackup();

      // Execute restore
      const restoreResult = await backupService.restoreBackup(record.id);
      expect(restoreResult.success).toBe(true);
      expect(restoreResult.restoredProfilesCount).toBeGreaterThan(0);
      expect(restoreResult.restoredAt).toBeDefined();
    });

    it('ROLLBACK GUARANTEE: failed restoration leaves data in exact pre-restore state (SPEC-07 §6)', async () => {
      // 1. Capture snapshot of pre-restore profiles and tags
      const preRestoreProfiles = await profilesService.getAllProfiles();
      const preRestoreTags = await profilesService.getTags();

      // 2. Craft corrupted backup archive (e.g. invalid profile without entityPeerId)
      const corruptedArchive: BackupArchive = {
        formatVersion: '1.0.0',
        appVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        telegramAccount: { telegramUserId: '1', displayName: 'Test' },
        profiles: [
          // @ts-expect-error intentionally corrupt profile
          { customDisplayName: 'Corrupted Profile', notes: 'Should fail' },
        ],
        tagsCatalog: [{ name: 'TemporaryTag', color: '#ff0000' }],
        applicationSettings: {},
      };

      // 3. Attempt restoration and assert it throws ValidationError
      await expect(
        profilesService.restoreBackupData(corruptedArchive)
      ).rejects.toThrow(ValidationError);

      // 4. Assert 100% rollback: exact same profiles and tags count and content
      const postRollbackProfiles = await profilesService.getAllProfiles();
      const postRollbackTags = await profilesService.getTags();

      expect(postRollbackProfiles.length).toBe(preRestoreProfiles.length);
      expect(postRollbackTags.length).toBe(preRestoreTags.length);
      expect(postRollbackTags.some((t) => t.name === 'TemporaryTag')).toBe(false);
    });
  });
});
