import { describe, it, expect, beforeEach } from 'vitest';
import { encryptSession, decryptSession } from '../../src/features/auth/crypto.js';
import { SendPhoneSchema, VerifyCodeSchema } from '../../src/features/auth/dto.js';
import { telegramService } from '../../src/features/auth/telegram-client.js';

describe('SPEC-02: Telegram MTProto Auth & Session Lifecycle', () => {
  beforeEach(async () => {
    await telegramService.disconnect();
  });

  describe('Session AES-256-GCM Encryption (SPEC-02 §4)', () => {
    it('encrypts and successfully decrypts session strings', () => {
      const originalSession = '1AZ5XyY0Bu8...mockTelegramSessionString123456';
      const encrypted = encryptSession(originalSession);

      // Verify encrypted string format [iv]:[tag]:[ciphertext]
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toHaveLength(24); // 12 bytes IV in hex
      expect(parts[1]).toHaveLength(32); // 16 bytes tag in hex
      expect(encrypted).not.toContain(originalSession);

      // Decrypt
      const decrypted = decryptSession(encrypted);
      expect(decrypted).toBe(originalSession);
    });

    it('rejects tampered or corrupted encrypted session data', () => {
      const original = 'secret_session_key';
      const encrypted = encryptSession(original);
      const parts = encrypted.split(':');

      // Tamper ciphertext
      const tampered = `${parts[0]}:${parts[1]}:deadbeef${parts[2].slice(8)}`;

      expect(() => decryptSession(tampered)).toThrow();
    });
  });

  describe('Phone Number Validation & International Format (FR-AUTH-007)', () => {
    it('accepts valid international E.164 phone numbers', () => {
      expect(SendPhoneSchema.safeParse({ phoneNumber: '+989123456789' }).success).toBe(true);
      expect(SendPhoneSchema.safeParse({ phoneNumber: '+12025550123' }).success).toBe(true);
      expect(SendPhoneSchema.safeParse({ phoneNumber: '+447911123456' }).success).toBe(true);
    });

    it('rejects invalid or local-only phone numbers without country code', () => {
      expect(SendPhoneSchema.safeParse({ phoneNumber: '09123456789' }).success).toBe(false);
      expect(SendPhoneSchema.safeParse({ phoneNumber: '9123456789' }).success).toBe(false);
      expect(SendPhoneSchema.safeParse({ phoneNumber: 'invalid_text' }).success).toBe(false);
    });
  });

  describe('Multi-Step Auth Flow (FR-AUTH-008, FR-AUTH-009)', () => {
    it('completes standard phone -> code verification flow', async () => {
      // 1. Send code
      const sendResult = await telegramService.sendCode('+989123456789');
      expect(sendResult.phoneCodeHash).toBeTruthy();
      expect(telegramService.getState()).toBe('CODE_REQUIRED');

      // 2. Submit valid code
      const verifyResult = await telegramService.verifyCode(
        '+989123456789',
        sendResult.phoneCodeHash,
        '12345'
      );

      expect(verifyResult.status).toBe('CONNECTED');
      expect(verifyResult.account?.telegramUserId).toBe('987654321');
      expect(telegramService.getState()).toBe('CONNECTED');

      // Check account info
      const account = telegramService.getAccount();
      expect(account?.displayName).toBe('Ehsan Key');
    });

    it('handles 2FA password challenge dynamically when required', async () => {
      const sendResult = await telegramService.sendCode('+989123456789');

      // Special simulation trigger for 2FA requirement
      const verifyResult = await telegramService.verifyCode(
        '+989123456789',
        sendResult.phoneCodeHash,
        '22222'
      );

      expect(verifyResult.status).toBe('PASSWORD_REQUIRED');
      expect(telegramService.getState()).toBe('PASSWORD_REQUIRED');

      // Submit 2FA password
      const account = await telegramService.verifyPassword('user_cloud_password');
      expect(account.telegramUserId).toBe('987654321');
      expect(telegramService.getState()).toBe('CONNECTED');
    });

    it('disconnects and clears active session cleanly', async () => {
      await telegramService.sendCode('+989123456789');
      await telegramService.verifyCode('+989123456789', 'hash', '12345');
      expect(telegramService.getState()).toBe('CONNECTED');

      await telegramService.disconnect();
      expect(telegramService.getState()).toBe('DISCONNECTED');
      expect(telegramService.getAccount()).toBeNull();
    });
  });
});
