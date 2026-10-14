import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import {
  BackupCorruptedError,
  BackupDecryptError,
} from '../../common/errors.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes IV (SPEC-07 §4)
const AUTH_TAG_LENGTH = 16; // 16 bytes Auth Tag
const PBKDF2_SALT = 'source_of_truth_backup_salt_2026';
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 32;

/**
 * Derives a cryptographic key using PBKDF2 from a user passphrase or default master secret
 */
function deriveEncryptionKey(passphrase?: string): Buffer {
  const secret = passphrase || env.TELEGRAM_SESSION_SECRET || 'default_sot_master_key_secret';
  return crypto.pbkdf2Sync(
    secret,
    PBKDF2_SALT,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );
}

/**
 * Encrypts a serialized JSON backup payload using AES-256-GCM (SPEC-07 §4)
 * Output file layout: [ 12 bytes IV | 16 bytes Auth Tag | Ciphertext ]
 */
export function encryptBackupArchive(
  plaintextJson: string,
  passphrase?: string
): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveEncryptionKey(passphrase);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintextJson, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Concatenate: [ IV (12) | Tag (16) | Ciphertext ]
  return Buffer.concat([iv, authTag, ciphertext]);
}

/**
 * Decrypts a backup archive buffer using AES-256-GCM.
 * Validates integrity via Auth Tag.
 */
export function decryptBackupArchive(
  encryptedBuffer: Buffer,
  passphrase?: string
): string {
  if (encryptedBuffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new BackupCorruptedError('The backup file is too small or truncated.');
  }

  const iv = encryptedBuffer.subarray(0, IV_LENGTH);
  const authTag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = encryptedBuffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const key = deriveEncryptionKey(passphrase);

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (err: unknown) {
    throw new BackupDecryptError(
      'Failed to decrypt backup. Invalid passphrase or tampered file.'
    );
  }
}
