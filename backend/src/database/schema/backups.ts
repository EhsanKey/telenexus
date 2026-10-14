import { pgTable, uuid, varchar, integer, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { telegramAccounts } from './accounts.js';

export const backupRecords = pgTable('backup_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  telegramAccountId: uuid('telegram_account_id')
    .notNull()
    .references(() => telegramAccounts.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 32 }).default('google_drive').notNull(),
  driveFileId: varchar('drive_file_id', { length: 255 }).notNull(),
  backupFormatVersion: varchar('backup_format_version', { length: 16 }).default('1.0.0').notNull(),
  status: varchar('status', { length: 32 }).notNull(), // 'PENDING' | 'SUCCESS' | 'FAILED'
  profilesCount: integer('profiles_count').default(0).notNull(),
  tagsCount: integer('tags_count').default(0).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_backup_records_account').on(table.telegramAccountId),
]);
