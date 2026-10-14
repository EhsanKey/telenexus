import { eq } from 'drizzle-orm';
import { db } from '../../database/client.js';
import { telegramSessions } from '../../database/schema/accounts.js';
import { encryptSession, decryptSession } from './crypto.js';
import { logger } from '../../common/index.js';

export class SessionStorage {
  private inMemoryDecrypted: string | null = null;

  /**
   * Saves plaintext session string in encrypted format (AES-256-GCM) directly to Neon PostgreSQL.
   */
  public async saveEncryptedSession(plaintextSession: string): Promise<void> {
    try {
      this.inMemoryDecrypted = plaintextSession;
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
   * Reads and decrypts stored session string from in-memory cache.
   */
  public loadDecryptedSession(): string | null {
    return this.inMemoryDecrypted;
  }

  /**
   * Asynchronous load from Neon PostgreSQL DB.
   */
  public async loadDecryptedSessionFromDb(): Promise<string | null> {
    if (this.inMemoryDecrypted) {
      return this.inMemoryDecrypted;
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
   * Clears active session upon disconnect from DB and memory.
   */
  public clearSession(): void {
    this.inMemoryDecrypted = null;

    db.delete(telegramSessions)
      .where(eq(telegramSessions.sessionKey, 'active_session'))
      .catch((err) => {
        logger.warn({ err }, 'Could not delete session from Neon DB');
      });

    logger.info('Telegram session cleared from database.');
  }

  public hasSession(): boolean {
    return Boolean(this.inMemoryDecrypted);
  }
}

export const sessionStorage = new SessionStorage();
