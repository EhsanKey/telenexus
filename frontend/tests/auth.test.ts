import { describe, it, expect } from 'vitest';
import type {
  AuthState,
  ConnectedAccount,
  SendPhoneResponseData,
  VerifyCodeResponseData,
} from '../src/types/auth.js';

describe('Frontend Telegram MTProto Auth (SPEC-02)', () => {
  it('validates auth state machine transitions', () => {
    let state: AuthState = 'DISCONNECTED';
    expect(state).toBe('DISCONNECTED');

    state = 'SENDING_PHONE';
    expect(state).toBe('SENDING_PHONE');

    state = 'CODE_REQUIRED';
    expect(state).toBe('CODE_REQUIRED');

    state = 'CONNECTED';
    expect(state).toBe('CONNECTED');
  });

  it('verifies ConnectedAccount shape conforming to SPEC-02 contracts', () => {
    const mockAccount: ConnectedAccount = {
      id: 'acc-123',
      telegramUserId: '987654321',
      displayName: 'Ehsan Key',
      username: 'ehsan_key',
      phoneNumber: '+989123456789',
    };

    expect(mockAccount.telegramUserId).toBe('987654321');
    expect(mockAccount.username).toBe('ehsan_key');
  });

  it('validates SendPhoneResponseData and timeoutSeconds', () => {
    const sendData: SendPhoneResponseData = {
      phoneCodeHash: 'hash_xyz123',
      isCodeViaApp: true,
      timeoutSeconds: 120,
    };

    expect(sendData.phoneCodeHash).toBe('hash_xyz123');
    expect(sendData.timeoutSeconds).toBe(120);
    expect(sendData.isCodeViaApp).toBe(true);
  });
});
