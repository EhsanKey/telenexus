import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { customProfiles } from './profiles.js';

export const profileSocialLinks = pgTable('profile_social_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  customProfileId: uuid('custom_profile_id')
    .notNull()
    .references(() => customProfiles.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 64 }).notNull(),
  url: text('url').notNull(),
  description: varchar('description', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_social_links_profile').on(table.customProfileId),
]);
