/**
 * Telegram MTProto Authentication Types (SPEC-02)
 */

export type AuthState =
  | 'DISCONNECTED'
  | 'SENDING_PHONE'
  | 'CODE_REQUIRED'
  | 'PASSWORD_REQUIRED'
  | 'CONNECTED'
  | 'FLOOD_WAIT'
  | 'INTERRUPTED'
  | 'EXPIRED';

export interface ConnectedAccount {
  id: string;
  telegramUserId: string;
  displayName: string;
  username: string | null;
  phoneNumber?: string;
}

export interface SendPhoneResponseData {
  phoneCodeHash: string;
  isCodeViaApp: boolean;
  timeoutSeconds: number;
}

export interface VerifyCodeResponseData {
  status: 'CONNECTED' | 'PASSWORD_REQUIRED';
  account?: ConnectedAccount;
}

export interface VerifyPasswordResponseData {
  status: 'CONNECTED';
  account: ConnectedAccount;
}

export interface AuthStatusResponseData {
  status: AuthState;
  account: ConnectedAccount | null;
}

export interface DashboardStatusResponseData {
  isPasscodeSet: boolean;
  isUnlocked: boolean;
  telegramState: AuthState;
}

export interface DashboardUnlockResponseData {
  isPasscodeSet: boolean;
  isUnlocked: boolean;
  token: string;
  message: string;
}

