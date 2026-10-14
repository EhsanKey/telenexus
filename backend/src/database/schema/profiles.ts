import { pgTable, uuid, varchar, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { telegramAccounts } from './accounts.js';
import { telegramEntities } from './entities.js';

export const customProfiles = pgTable('custom_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  telegramAccountId: uuid('telegram_account_id')
    .notNull()
    .references(() => telegramAccounts.id, { onDelete: 'cascade' }),
  telegramEntityId: uuid('telegram_entity_id')
    .notNull()
    .references(() => telegramEntities.id, { onDelete: 'cascade' }),
  customDisplayName: varchar('custom_display_name', { length: 255 }),
  telegramDisplayName: varchar('telegram_display_name', { length: 255 }),
  phoneNumber: varchar('phone_number', { length: 32 }),
  company: varchar('company', { length: 255 }),
  jobTitle: varchar('job_title', { length: 255 }),
  relationshipType: varchar('relationship_type', { length: 100 }),
  reasonForJoining: text('reason_for_joining'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('uq_account_entity_profile').on(table.telegramAccountId, table.telegramEntityId),
]);
