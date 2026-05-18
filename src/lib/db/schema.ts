import { pgTable, text, timestamp, boolean, integer, uuid, serial } from 'drizzle-orm/pg-core';

// Games: ID, Name, Game End Time, Cache Count, Is Active (boolean), Admin Recall Triggered (boolean)
export const games = pgTable('games', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  gameEndTime: timestamp('game_end_time', { mode: 'date' }).notNull(),
  cacheCount: integer('cache_count').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  adminRecallTriggered: boolean('admin_recall_triggered').notNull().default(false),
});

// Registration Tokens: ID, Secure Token (random, non-sequential) — generated once, reused across games
export const registrationTokens = pgTable('registration_tokens', {
  id: serial('id').primaryKey(),
  token: text('token').notNull().unique(),
});

// Caches: ID, Name/Location, Clue 1 Text, Clue 2 Text, Clue 3 Text, Clue 3 Image URL, Cache Location Token (random, non-sequential)
export const caches = pgTable('caches', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  clue1Text: text('clue_1_text').notNull(),
  clue2Text: text('clue_2_text').notNull(),
  clue3Text: text('clue_3_text').notNull(),
  clue3ImageUrl: text('clue_3_image_url'),
  cacheToken: text('cache_token').notNull().unique(),
});

// Teams: ID, Game ID, Registration Token ID, Display Name, Members, Current Cache Index, Registration Timestamp
export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  gameId: integer('game_id').notNull().references(() => games.id),
  registrationTokenId: integer('registration_token_id').notNull().references(() => registrationTokens.id),
  displayName: text('display_name').notNull(),
  members: text('members').notNull(), // JSON array of member names
  currentCacheIndex: integer('current_cache_index').notNull().default(0),
  registrationTimestamp: timestamp('registration_timestamp', { mode: 'date' }).notNull().defaultNow(),
});

// Team Sequences: ID, Team ID, Cache ID, Sequence Order
export const teamSequences = pgTable('team_sequences', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id),
  cacheId: integer('cache_id').notNull().references(() => caches.id),
  sequenceOrder: integer('sequence_order').notNull(),
});

// Progress Log: ID, Team ID, Cache ID, Clue 1 Requested Timestamp, Clue 2 Requested Timestamp, Clue 3 Requested Timestamp, Found Timestamp, Points, Skipped (boolean)
export const progressLogs = pgTable('progress_logs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id),
  cacheId: integer('cache_id').notNull().references(() => caches.id),
  clue1RequestedTimestamp: timestamp('clue_1_requested_timestamp', { mode: 'date' }),
  clue2RequestedTimestamp: timestamp('clue_2_requested_timestamp', { mode: 'date' }),
  clue3RequestedTimestamp: timestamp('clue_3_requested_timestamp', { mode: 'date' }),
  foundTimestamp: timestamp('found_timestamp', { mode: 'date' }),
  points: integer('points').notNull().default(0),
  skipped: boolean('skipped').notNull().default(false),
});

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;

export type RegistrationToken = typeof registrationTokens.$inferSelect;
export type NewRegistrationToken = typeof registrationTokens.$inferInsert;

export type Cache = typeof caches.$inferSelect;
export type NewCache = typeof caches.$inferInsert;

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

export type TeamSequence = typeof teamSequences.$inferSelect;
export type NewTeamSequence = typeof teamSequences.$inferInsert;

// Game Caches: links specific caches to a game (admin assigns which caches are active for a game)
export const gameCaches = pgTable('game_caches', {
  id: serial('id').primaryKey(),
  gameId: integer('game_id').notNull().references(() => games.id),
  cacheId: integer('cache_id').notNull().references(() => caches.id),
});

export type GameCache = typeof gameCaches.$inferSelect;
export type NewGameCache = typeof gameCaches.$inferInsert;

export type ProgressLog = typeof progressLogs.$inferSelect;
export type NewProgressLog = typeof progressLogs.$inferInsert;
