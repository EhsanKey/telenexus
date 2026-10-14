import { pgTable, uuid, varchar, timestamp, primaryKey, uniqueIndex } from 'drizzle-orm/pg-core';
import { telegramAccounts } from './accounts.js';
import { customProfiles } from './profiles.js';

export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  telegramAccountId: uuid('telegram_account_id')
    .notNull()
    .references(() => telegramAccounts.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 64 }).notNull(),
  color: varchar('color', { length: 32 }).default('#3B82F6'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uq_account_tag_name').on(table.telegramAccountId, table.name),
]);

export const profileTags = pgTable('profile_tags', {
  customProfileId: uuid('custom_profile_id')
    .notNull()
    .references(() => customProfiles.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id')
    .notNull()
    .references(() => tags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.customProfileId, table.tagId] }),
]);
