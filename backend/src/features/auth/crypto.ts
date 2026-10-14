import crypto from 'node:crypto';
import { env } from '../../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a consistent 32-byte key from the environment session secret
 */
function getDerivedKey(): Buffer {
  return crypto.createHash('sha256').update(env.TELEGRAM_SESSION_SECRET).digest();
}

/**
 * Encrypts a string (e.g. GramJS StringSession) using AES-256-GCM.
 * Output format: [iv_hex]:[authTag_hex]:[ciphertext_hex]
 */
export function encryptSession(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getDerivedKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext}`;
}

/**
 * Decrypts a session string encrypted with AES-256-GCM.
 * Validates integrity via authentication tag.
 */
export function decryptSession(encryptedPayload: string): string {
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted session string');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = getDerivedKey();

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
