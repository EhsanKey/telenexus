import { pgTable, uuid, bigint, text, timestamp } from 'drizzle-orm/pg-core';

export const telegramAccounts = pgTable('telegram_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  telegramUserId: bigint('telegram_user_id', { mode: 'bigint' }).notNull(),
  displayName: text('display_name'),
  username: text('username'),
  phoneNumber: text('phone_number'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  disconnectedAt: timestamp('disconnected_at', { withTimezone: true }),
});

export const telegramSessions = pgTable('telegram_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionKey: text('session_key').notNull().unique().default('active_session'),
  encryptedPayload: text('encrypted_payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
