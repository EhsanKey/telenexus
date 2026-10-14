import { pgTable, uuid, varchar, bigint, text, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { telegramAccounts } from './accounts.js';

export const telegramEntities = pgTable('telegram_entities', {
  id: uuid('id').defaultRandom().primaryKey(),
  telegramAccountId: uuid('telegram_account_id')
    .notNull()
    .references(() => telegramAccounts.id, { onDelete: 'cascade' }),
  entityType: varchar('entity_type', { length: 16 }).notNull(), // 'user' | 'group' | 'channel'
  telegramPeerId: bigint('telegram_peer_id', { mode: 'bigint' }).notNull(),
  telegramUserId: bigint('telegram_user_id', { mode: 'bigint' }),
  telegramChatId: bigint('telegram_chat_id', { mode: 'bigint' }),
  telegramAccessHash: bigint('telegram_access_hash', { mode: 'bigint' }),
  telegramUsername: text('telegram_username'),
  telegramDisplayName: text('telegram_display_name'),
  telegramPublicUrl: text('telegram_public_url'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uq_account_entity_peer').on(table.telegramAccountId, table.entityType, table.telegramPeerId),
]);
