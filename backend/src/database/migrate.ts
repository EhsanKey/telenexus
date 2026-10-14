import { db } from './client.js';
import { sql } from 'drizzle-orm';
import { logger } from '../common/index.js';

export async function runMigrations(): Promise<void> {
  logger.info('Running database migration for TeleNexus...');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS telegram_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      telegram_user_id BIGINT NOT NULL,
      display_name TEXT,
      username TEXT,
      phone_number TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      disconnected_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS telegram_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_key TEXT NOT NULL UNIQUE DEFAULT 'active_session',
      encrypted_payload TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS custom_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      telegram_account_id UUID REFERENCES telegram_accounts(id) ON DELETE CASCADE,
      entity_peer_id TEXT NOT NULL,
      entity_type VARCHAR(16) NOT NULL DEFAULT 'user',
      custom_display_name TEXT,
      telegram_display_name TEXT,
      phone_number TEXT,
      company TEXT,
      job_title TEXT,
      relationship_type TEXT,
      reason_for_joining TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_account_entity UNIQUE (telegram_account_id, entity_peer_id)
    );

    ALTER TABLE custom_profiles ADD COLUMN IF NOT EXISTS telegram_display_name TEXT;

    CREATE TABLE IF NOT EXISTS social_links (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      custom_profile_id UUID REFERENCES custom_profiles(id) ON DELETE CASCADE,
      label VARCHAR(64) NOT NULL,
      url TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(64) NOT NULL UNIQUE,
      color VARCHAR(16),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS profile_tags (
      custom_profile_id UUID REFERENCES custom_profiles(id) ON DELETE CASCADE,
      tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (custom_profile_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS backup_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      telegram_account_id UUID REFERENCES telegram_accounts(id) ON DELETE CASCADE,
      provider VARCHAR(32) NOT NULL DEFAULT 'google_drive',
      drive_file_id VARCHAR(255) NOT NULL,
      backup_format_version VARCHAR(16) NOT NULL DEFAULT '1.0.0',
      status VARCHAR(32) NOT NULL CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
      profiles_count INT NOT NULL DEFAULT 0,
      tags_count INT NOT NULL DEFAULT 0,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS application_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key VARCHAR(64) NOT NULL UNIQUE,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  logger.info('Database migration executed successfully.');
}

// Execute directly if run as CLI
if (process.argv[1]?.includes('migrate.ts') || process.argv[1]?.includes('migrate.js')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ err }, 'Migration failed');
      process.exit(1);
    });
}
