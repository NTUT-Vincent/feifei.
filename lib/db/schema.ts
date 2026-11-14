import { pgTable, text, timestamp, integer, primaryKey } from 'drizzle-orm/pg-core';
export const guestSessions = pgTable('guest_sessions', {
  id: text('id_hash').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
export const connectedAccounts = pgTable('connected_accounts', {
  sessionId: text('session_id').notNull().references(() => guestSessions.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  userId: text('provider_user_id').notNull(),
  displayName: text('display_name').notNull(),
  accessToken: text('encrypted_access_token').notNull(),
  refreshToken: text('encrypted_refresh_token'),
  expiresAt: timestamp('token_expires_at', { withTimezone: true }).notNull(),
  scopes: text('scopes').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.sessionId, t.provider] })]);
export const oauthStates = pgTable('oauth_states', {
  hash: text('state_hash').primaryKey(),
  sessionId: text('session_id').notNull().references(() => guestSessions.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  verifier: text('encrypted_verifier').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
export const requestBudgets = pgTable('request_budgets', {
  key: text('key').primaryKey(), count: integer('count').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
