import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const accessKeys = pgTable('access_keys', {
  id: text().primaryKey(),
  keyHash: text('key_hash').notNull(),
  version: text().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const accessSessions = pgTable('access_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  keyVersion: text('key_version').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const accessAttempts = pgTable('access_attempts', {
  id: text().primaryKey(),
  count: integer().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
