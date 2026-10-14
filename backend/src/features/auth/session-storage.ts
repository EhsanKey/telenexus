import { eq } from 'drizzle-orm';
import { db } from '../../database/client.js';
import { telegramSessions, telegramAccounts } from '../../database/schema/accounts.js';
import { applicationSettings } from '../../database/schema/settings.js';
import { encryptSession, decryptSession } from './crypto.js';
import { logger } from '../../common/index.js';

export interface ConnectedAccount {
  id: string;
  telegramUserId: string;
  displayName: string;
  username: string | null;
  phoneNumber?: string;
}

export class SessionStorage {
  private inMemoryDecrypted: string | null = null;
  private inMemoryAccount: ConnectedAccount | null = null;

  /**
   * Saves plaintext session string in encrypted format (AES-256-GCM) directly to Neon PostgreSQL.
   */
  public async saveEncryptedSession(plaintextSession: string): Promise<void> {
    try {
      this.inMemoryDecrypted = plaintextSession;

      // In unit test environment, protect production Neon DB records
      if (process.env.NODE_ENV === 'test') {
        return;
      }

      const encrypted = encryptSession(plaintextSession);

      await db
        .insert(telegramSessions)
        .values({
          sessionKey: 'active_session',
          encryptedPayload: encrypted,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: telegramSessions.sessionKey,
          set: {
            encryptedPayload: encrypted,
            updatedAt: new Date(),
          },
        });

      logger.info('Telegram MTProto session encrypted and persisted to Neon PostgreSQL.');
    } catch (error) {
      logger.error({ error }, 'Failed to save encrypted Telegram session.');
      throw error;
    }
  }

  /**
   * Persists connected Telegram account metadata to Neon PostgreSQL.
   */
  public async saveAccount(account: ConnectedAccount): Promise<void> {
    try {
      this.inMemoryAccount = account;

      // In unit test environment, protect production Neon DB records
      if (process.env.NODE_ENV === 'test') {
        return;
      }

      await db
        .insert(applicationSettings)
        .values({
          key: 'telegram_active_account',
          value: JSON.stringify(account),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: applicationSettings.key,
          set: {
            value: JSON.stringify(account),
            updatedAt: new Date(),
          },
        });

      // Synchronize relational telegram_accounts table safely
      try {
        const userIdBigInt = BigInt(account.telegramUserId);
        await db
          .insert(telegramAccounts)
          .values({
            telegramUserId: userIdBigInt,
            displayName: account.displayName,
            username: account.username,
            phoneNumber: account.phoneNumber,
            updatedAt: new Date(),
          })
          .onConflictDoNothing();
      } catch (accErr) {
        logger.warn({ accErr }, 'Relational telegram_accounts sync notice');
      }

      logger.info({ displayName: account.displayName }, 'Telegram active account persisted to Neon PostgreSQL.');
    } catch (error) {
      logger.warn({ error }, 'Could not persist active account metadata to database');
    }
  }

  /**
   * Reads stored session string from in-memory cache.
   */
  public loadDecryptedSession(): string | null {
    return this.inMemoryDecrypted;
  }

  /**
   * Reads cached account metadata from in-memory cache.
   */
  public loadAccount(): ConnectedAccount | null {
    return this.inMemoryAccount;
  }

  /**
   * Asynchronous load of encrypted session from Neon PostgreSQL DB.
   */
  public async loadDecryptedSessionFromDb(): Promise<string | null> {
    if (this.inMemoryDecrypted) {
      return this.inMemoryDecrypted;
    }

    if (process.env.NODE_ENV === 'test') {
      return null;
    }

    try {
      const records = await db
        .select()
        .from(telegramSessions)
        .where(eq(telegramSessions.sessionKey, 'active_session'))
        .limit(1);

      if (records.length > 0 && records[0].encryptedPayload) {
        const decrypted = decryptSession(records[0].encryptedPayload);
        this.inMemoryDecrypted = decrypted;
        logger.info('Restored encrypted Telegram session from Neon PostgreSQL database.');
        return decrypted;
      }
    } catch (err) {
      logger.warn({ err }, 'Could not query session from Neon DB');
    }

    return null;
  }

  /**
   * Asynchronous load of active account metadata from Neon PostgreSQL DB.
   */
  public async loadAccountFromDb(): Promise<ConnectedAccount | null> {
    if (this.inMemoryAccount) {
      return this.inMemoryAccount;
    }

    if (process.env.NODE_ENV === 'test') {
      return null;
    }

    try {
      const records = await db
        .select()
        .from(applicationSettings)
        .where(eq(applicationSettings.key, 'telegram_active_account'))
        .limit(1);

      if (records.length > 0 && records[0].value) {
        const parsed = JSON.parse(records[0].value) as ConnectedAccount;
        this.inMemoryAccount = parsed;
        logger.info({ displayName: parsed.displayName }, 'Restored active Telegram account profile from Neon PostgreSQL.');
        return parsed;
      }
    } catch (err) {
      logger.warn({ err }, 'Could not query active account from Neon DB');
    }

    return null;
  }

  /**
   * Clears active session and account metadata upon explicit disconnect.
   */
  public clearSession(): void {
    this.inMemoryDecrypted = null;
    this.inMemoryAccount = null;

    if (process.env.NODE_ENV === 'test') {
      return;
    }

    Promise.all([
      db
        .delete(telegramSessions)
        .where(eq(telegramSessions.sessionKey, 'active_session'))
        .catch((err) => {
          logger.warn({ err }, 'Could not delete session from Neon DB');
        }),
      db
        .delete(applicationSettings)
        .where(eq(applicationSettings.key, 'telegram_active_account'))
        .catch((err) => {
          logger.warn({ err }, 'Could not delete active account from Neon DB');
        }),
    ]).then(() => {
      logger.info('Telegram session and account records cleared from database.');
    });
  }

  public hasSession(): boolean {
    return Boolean(this.inMemoryDecrypted);
  }
}

export const sessionStorage = new SessionStorage();
