import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { env } from '../../config/env.js';
import { sessionStorage, type ConnectedAccount } from './session-storage.js';
import { dashboardAuth } from './dashboard-auth.js';
import {
  FloodWaitError,
  ValidationError,
  AppError,
} from '../../common/errors.js';
import { logger } from '../../common/index.js';

export type AuthState =
  | 'DISCONNECTED'
  | 'SENDING_PHONE'
  | 'CODE_REQUIRED'
  | 'PASSWORD_REQUIRED'
  | 'CONNECTED'
  | 'FLOOD_WAIT'
  | 'INTERRUPTED'
  | 'EXPIRED';

export type { ConnectedAccount };

export class TelegramService {
  private client: TelegramClient | null = null;
  private currentStringSession: StringSession;
  private pendingPhone: string | null = null;
  private pendingPhoneCodeHash: string | null = null;
  private state: AuthState = 'DISCONNECTED';
  private cachedAccount: ConnectedAccount | null = null;

  constructor() {
    const savedSession = sessionStorage.loadDecryptedSession();
    try {
      this.currentStringSession = new StringSession(savedSession || '');
    } catch {
      this.currentStringSession = new StringSession('');
    }
    if (savedSession) {
      this.state = 'CONNECTED';
      const inMemoryAcc = sessionStorage.loadAccount();
      if (inMemoryAcc) {
        this.cachedAccount = inMemoryAcc;
      }
    }

    if (!this.isSimulationMode()) {
      this.autoConnectSavedSession().catch((err) => {
        logger.warn({ err }, 'Background auto-connect for saved Telegram session failed');
      });
    }
  }

  private async autoConnectSavedSession(): Promise<void> {
    try {
      let sessionStr = sessionStorage.loadDecryptedSession();
      if (!sessionStr) {
        sessionStr = await sessionStorage.loadDecryptedSessionFromDb();
        if (sessionStr) {
          this.currentStringSession = new StringSession(sessionStr);
          this.state = 'CONNECTED';
        }
      }

      if (!sessionStr) {
        return;
      }

      // Restore saved user account profile immediately from database
      if (!this.cachedAccount) {
        const savedAccount = await sessionStorage.loadAccountFromDb();
        if (savedAccount) {
          this.cachedAccount = savedAccount;
          this.state = 'CONNECTED';
          logger.info(
            { displayName: savedAccount.displayName },
            'Restored active Telegram account profile from Neon PostgreSQL.'
          );
        }
      }

      const client = await this.ensureClient();
      if (client) {
        try {
          const me: any = await client.getMe();
          if (me) {
            this.cachedAccount = {
              id: 'acc-' + me.id,
              telegramUserId: String(me.id),
              displayName: [me.firstName, me.lastName].filter(Boolean).join(' ') || 'Telegram User',
              username: me.username || null,
              phoneNumber: me.phone || this.cachedAccount?.phoneNumber,
            };
            this.state = 'CONNECTED';
            await sessionStorage.saveAccount(this.cachedAccount);
            logger.info(
              { displayName: this.cachedAccount.displayName },
              'Verified and refreshed active Telegram MTProto session'
            );
          }
        } catch (meErr: any) {
          const errMsg = String(meErr?.errorMessage || meErr?.message || '');
          if (errMsg.includes('USER_DEACTIVATED') || errMsg.includes('AUTH_KEY_UNREGISTERED')) {
            this.state = 'DISCONNECTED';
            this.cachedAccount = null;
            sessionStorage.clearSession();
            logger.warn('Saved Telegram MTProto session was deactivated by Telegram.');
          } else {
            logger.warn({ meErr }, 'Notice: GramJS live getMe verification deferred; keeping restored session active');
          }
        }
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to verify restored Telegram session in background');
    }
  }

  public async initialize(): Promise<void> {
    if (this.isSimulationMode()) return;
    try {
      await this.autoConnectSavedSession();
    } catch (err) {
      logger.warn({ err }, 'Failed to initialize saved Telegram session');
    }
  }

  public getState(): AuthState {
    return this.state;
  }

  public getAccount(): ConnectedAccount | null {
    return this.cachedAccount;
  }

  public getConnectedAccount(): ConnectedAccount | null {
    return this.cachedAccount;
  }

  public getClient(): TelegramClient | null {
    return this.client;
  }

  /**
   * Checks if real MTProto credentials are configured or running in development simulation.
   */
  private isSimulationMode(): boolean {
    return (
      env.TELEGRAM_API_ID === 12345678 ||
      !env.TELEGRAM_API_HASH ||
      env.TELEGRAM_API_HASH === 'sample_hash_for_dev_init' ||
      env.NODE_ENV === 'test'
    );
  }

  /**
   * Initializes GramJS client connection
   */
  public async ensureClient(): Promise<TelegramClient | null> {
    if (this.isSimulationMode()) {
      return null;
    }

    if (!this.client) {
      const clientOptions: any = {
        connectionRetries: 5,
        deviceModel: 'PC 64bit',
        systemVersion: 'Windows 11',
        appVersion: '5.10.4 x64',
        langCode: 'en',
        systemLangCode: 'en',
        useWSS: false,
        autoReconnect: true,
      };

      if (env.TELEGRAM_PROXY_HOST && env.TELEGRAM_PROXY_PORT) {
        clientOptions.proxy = {
          ip: env.TELEGRAM_PROXY_HOST,
          port: env.TELEGRAM_PROXY_PORT,
          socksType: 5,
          secret: env.TELEGRAM_PROXY_SECRET,
        };
      }

      const client = new TelegramClient(
        this.currentStringSession,
        env.TELEGRAM_API_ID,
        env.TELEGRAM_API_HASH,
        clientOptions
      );
      await client.connect();
      this.client = client;
    } else if (!this.client.connected) {
      try {
        await this.client.connect();
      } catch (err) {
        logger.warn({ err }, 'GramJS client reconnect attempt notice');
      }
    }
    return this.client;
  }

  /**
   * Step 1: Send phone number to Telegram
   */
  public async sendCode(phoneNumber: string): Promise<{
    phoneCodeHash: string;
    isCodeViaApp: boolean;
    timeoutSeconds: number;
  }> {
    this.state = 'SENDING_PHONE';
    this.pendingPhone = phoneNumber;

    if (this.isSimulationMode()) {
      logger.info({ phone: '[REDACTED]' }, 'Simulation: Sending verification code');
      this.pendingPhoneCodeHash = 'sim_hash_' + Math.random().toString(36).substring(2, 9);
      this.state = 'CODE_REQUIRED';
      return {
        phoneCodeHash: this.pendingPhoneCodeHash,
        isCodeViaApp: true,
        timeoutSeconds: 120,
      };
    }

    try {
      const client = await this.ensureClient();
      if (!client) throw new Error('Client unavailable');

      const result = await client.sendCode(
        {
          apiId: env.TELEGRAM_API_ID,
          apiHash: env.TELEGRAM_API_HASH,
        },
        phoneNumber
      );

      this.pendingPhoneCodeHash = result.phoneCodeHash;
      this.state = 'CODE_REQUIRED';

      return {
        phoneCodeHash: result.phoneCodeHash,
        isCodeViaApp: Boolean(result.isCodeViaApp),
        timeoutSeconds: 120,
      };
    } catch (error: unknown) {
      this.handleMtprotoError(error);
      throw error;
    }
  }

  /**
   * Step 2: Submit verification code
   */
  public async verifyCode(
    phoneNumber: string,
    phoneCodeHash: string,
    code: string
  ): Promise<{ status: 'CONNECTED' | 'PASSWORD_REQUIRED'; account?: ConnectedAccount }> {
    if (this.isSimulationMode()) {
      if (code === '22222') {
        // Simulation trigger for 2FA password requirement
        this.state = 'PASSWORD_REQUIRED';
        return { status: 'PASSWORD_REQUIRED' };
      }

      if (code === '00000') {
        throw new ValidationError('Invalid verification code entered.');
      }

      // Successful simulated connection
      this.state = 'CONNECTED';
      this.cachedAccount = {
        id: 'account-' + Math.floor(Math.random() * 9000 + 1000),
        telegramUserId: '987654321',
        displayName: 'Ehsan Key',
        username: 'ehsan_key',
        phoneNumber,
      };

      const mockSession = 'sim_session_' + Buffer.from(phoneNumber).toString('base64');
      await sessionStorage.saveEncryptedSession(mockSession);
      await sessionStorage.saveAccount(this.cachedAccount);

      return {
        status: 'CONNECTED',
        account: this.cachedAccount,
      };
    }

    try {
      const client = await this.ensureClient();
      if (!client) throw new Error('Client unavailable');

      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber,
          phoneCodeHash,
          phoneCode: code,
        })
      );

      // Save encrypted session
      const sessionStr = String(client.session.save());
      await sessionStorage.saveEncryptedSession(sessionStr);

      this.state = 'CONNECTED';
      const me: any = await client.getMe();

      this.cachedAccount = {
        id: 'acc-' + me.id,
        telegramUserId: String(me.id),
        displayName: [me.firstName, me.lastName].filter(Boolean).join(' ') || 'Telegram User',
        username: me.username || null,
        phoneNumber: me.phone || phoneNumber,
      };

      await sessionStorage.saveAccount(this.cachedAccount);

      return {
        status: 'CONNECTED',
        account: this.cachedAccount,
      };
    } catch (error: any) {
      if (error?.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        this.state = 'PASSWORD_REQUIRED';
        return { status: 'PASSWORD_REQUIRED' };
      }
      this.handleMtprotoError(error);
      throw error;
    }
  }

  /**
   * Step 3: Submit 2FA password
   */
  public async verifyPassword(password: string): Promise<ConnectedAccount> {
    if (this.isSimulationMode()) {
      if (password === 'wrong') {
        throw new ValidationError('Incorrect 2FA password.');
      }

      this.state = 'CONNECTED';
      this.cachedAccount = {
        id: 'account-2fa-1001',
        telegramUserId: '987654321',
        displayName: 'Ehsan Key',
        username: 'ehsan_key',
      };

      await sessionStorage.saveEncryptedSession('sim_session_2fa_ok');
      await sessionStorage.saveAccount(this.cachedAccount);
      return this.cachedAccount;
    }

    try {
      const client = await this.ensureClient();
      if (!client) throw new Error('Client unavailable');

      await client.signInWithPassword({
        apiId: env.TELEGRAM_API_ID,
        apiHash: env.TELEGRAM_API_HASH,
      }, {
        password: () => Promise.resolve(password),
        onError: (err) => { throw err; },
      });

      const sessionStr = String(client.session.save());
      await sessionStorage.saveEncryptedSession(sessionStr);

      this.state = 'CONNECTED';
      const me: any = await client.getMe();

      this.cachedAccount = {
        id: 'acc-' + me.id,
        telegramUserId: String(me.id),
        displayName: [me.firstName, me.lastName].filter(Boolean).join(' ') || 'Telegram User',
        username: me.username || null,
        phoneNumber: me.phone,
      };

      await sessionStorage.saveAccount(this.cachedAccount);

      return this.cachedAccount;
    } catch (error: unknown) {
      this.handleMtprotoError(error);
      throw error;
    }
  }

  /**
   * Disconnect Telegram account without deleting custom metadata
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.disconnect();
      } catch (err) {
        logger.warn({ err }, 'Error disconnecting client');
      }
      this.client = null;
    }

    sessionStorage.clearSession();
    dashboardAuth.resetPasscode();
    this.currentStringSession = new StringSession('');
    this.cachedAccount = null;
    this.pendingPhone = null;
    this.pendingPhoneCodeHash = null;
    this.state = 'DISCONNECTED';
    logger.info('Telegram account successfully disconnected and master passcode reset.');
  }

  /**
   * Cancel pending auth challenge
   */
  public cancelAuth(): void {
    this.pendingPhone = null;
    this.pendingPhoneCodeHash = null;
    this.state = 'DISCONNECTED';
  }

  /**
   * Error normalization matching SPEC-02 and SPEC-09
   */
  private handleMtprotoError(error: any): void {
    const errMsg = String(error?.errorMessage || error?.message || '');

    // Catch FLOOD_WAIT_X
    const floodMatch = errMsg.match(/FLOOD_WAIT_(\d+)/i);
    if (floodMatch) {
      const seconds = parseInt(floodMatch[1], 10);
      this.state = 'FLOOD_WAIT';
      throw new FloodWaitError(seconds);
    }

    if (errMsg.includes('PEER_FLOOD')) {
      throw new AppError(
        'Telegram Anti-Spam protection triggered (PEER_FLOOD). Your account is temporarily restricted from initiating conversations with non-contacts. Please wait.',
        'PEER_FLOOD',
        429
      );
    }

    if (errMsg.includes('USER_DEACTIVATED') || errMsg.includes('AUTH_KEY_UNREGISTERED')) {
      this.state = 'DISCONNECTED';
      this.cachedAccount = null;
      throw new AppError(
        'Telegram session has been revoked or deactivated by Telegram.',
        'SESSION_REVOKED',
        401
      );
    }

    if (errMsg.includes('PHONE_NUMBER_INVALID')) {
      throw new ValidationError('Invalid phone number format provided to Telegram.');
    }

    if (errMsg.includes('PHONE_CODE_INVALID')) {
      throw new ValidationError('Invalid verification code.');
    }

    if (errMsg.includes('PHONE_CODE_EXPIRED')) {
      throw new ValidationError('Verification code has expired. Please request a new code.');
    }

    if (errMsg.includes('PASSWORD_HASH_INVALID')) {
      throw new ValidationError('Incorrect 2FA password provided.');
    }
  }
}

export const telegramService = new TelegramService();
