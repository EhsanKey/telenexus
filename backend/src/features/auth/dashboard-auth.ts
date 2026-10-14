import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../../database/client.js';
import { applicationSettings } from '../../database/schema/settings.js';
import { logger, AUTH_DEFAULTS } from '../../common/index.js';
import { ValidationError } from '../../common/errors.js';

export interface PasscodeRecord {
  hash: string;
  salt: string;
  createdAt: string;
  updatedAt: string;
}

export class DashboardAuthService {
  private passcodeRecord: PasscodeRecord | null = null;
  private activeTokens: Set<string> = new Set();
  private tokensLoaded = false;

  public async loadTokens(): Promise<Set<string>> {
    if (this.tokensLoaded) return this.activeTokens;

    try {
      const records = await db
        .select()
        .from(applicationSettings)
        .where(eq(applicationSettings.key, 'dashboard_active_tokens'))
        .limit(1);

      if (records.length > 0 && records[0].value) {
        const tokensArray = JSON.parse(records[0].value);
        if (Array.isArray(tokensArray)) {
          for (const t of tokensArray) {
            if (typeof t === 'string') {
              this.activeTokens.add(t);
            }
          }
        }
      }
      this.tokensLoaded = true;
    } catch (err) {
      logger.warn({ err }, 'Could not load active dashboard tokens from database');
    }
    return this.activeTokens;
  }

  private async persistTokens(): Promise<void> {
    try {
      const tokensArray = Array.from(this.activeTokens);
      await db
        .insert(applicationSettings)
        .values({
          key: 'dashboard_active_tokens',
          value: JSON.stringify(tokensArray),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: applicationSettings.key,
          set: {
            value: JSON.stringify(tokensArray),
            updatedAt: new Date(),
          },
        });
    } catch (err) {
      logger.warn({ err }, 'Could not persist active dashboard tokens to database');
    }
  }

  public async loadPasscode(): Promise<PasscodeRecord | null> {
    if (!this.passcodeRecord) {
      try {
        const records = await db
          .select()
          .from(applicationSettings)
          .where(eq(applicationSettings.key, 'dashboard_master_passcode'))
          .limit(1);

        if (records.length > 0 && records[0].value) {
          this.passcodeRecord = JSON.parse(records[0].value);
          logger.info('Loaded dashboard master passcode from PostgreSQL database.');
        }
      } catch (err) {
        logger.warn({ err }, 'Could not query master passcode from database');
      }
    }

    await this.loadTokens();
    return this.passcodeRecord;
  }

  public isPasscodeSet(): boolean {
    return Boolean(this.passcodeRecord?.hash);
  }

  public async setupPasscode(passcode: string): Promise<string> {
    if (!passcode || passcode.trim().length < AUTH_DEFAULTS.MIN_PASSCODE_LENGTH) {
      throw new ValidationError(
        `Passcode must be at least ${AUTH_DEFAULTS.MIN_PASSCODE_LENGTH} characters long.`
      );
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(passcode.trim(), salt, 64).toString('hex');
    const now = new Date().toISOString();

    this.passcodeRecord = {
      hash,
      salt,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await db
        .insert(applicationSettings)
        .values({
          key: 'dashboard_master_passcode',
          value: JSON.stringify(this.passcodeRecord),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: applicationSettings.key,
          set: {
            value: JSON.stringify(this.passcodeRecord),
            updatedAt: new Date(),
          },
        });
      logger.info('Dashboard master passcode persisted to PostgreSQL database.');
    } catch (err) {
      logger.warn({ err }, 'Could not persist passcode to database');
    }

    logger.info('Dashboard master passcode configured successfully.');

    // Issue initial session token for this browser
    const token = this.generateToken();
    this.activeTokens.add(token);
    await this.persistTokens();
    return token;
  }

  public async verifyPasscode(passcode: string): Promise<string> {
    if (!this.passcodeRecord) {
      await this.loadPasscode();
    }
    if (!this.passcodeRecord) {
      throw new ValidationError('No master passcode has been set for this dashboard.');
    }

    const computedHash = crypto
      .scryptSync(passcode.trim(), this.passcodeRecord.salt, 64)
      .toString('hex');

    if (computedHash !== this.passcodeRecord.hash) {
      throw new ValidationError('Invalid master passcode entered.');
    }

    const token = this.generateToken();
    this.activeTokens.add(token);
    await this.persistTokens();
    logger.info('Dashboard unlocked successfully.');
    return token;
  }

  public isUnlocked(token?: string | null): boolean {
    if (!token) return false;
    return this.activeTokens.has(token);
  }

  public async revokeToken(token?: string | null): Promise<void> {
    if (token && this.activeTokens.has(token)) {
      this.activeTokens.delete(token);
      await this.persistTokens();
      logger.info('Dashboard session revoked (logged out).');
    }
  }

  public async resetPasscode(): Promise<void> {
    this.passcodeRecord = null;
    this.activeTokens.clear();
    this.tokensLoaded = true;

    await Promise.all([
      db
        .delete(applicationSettings)
        .where(eq(applicationSettings.key, 'dashboard_master_passcode'))
        .catch(() => {}),
      db
        .delete(applicationSettings)
        .where(eq(applicationSettings.key, 'dashboard_active_tokens'))
        .catch(() => {}),
    ]);

    logger.info('Dashboard master passcode and sessions reset completely.');
  }

  private generateToken(): string {
    return 'tn_sec_' + crypto.randomBytes(24).toString('hex');
  }
}

export const dashboardAuth = new DashboardAuthService();
