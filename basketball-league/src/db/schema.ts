import { sql } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { sqliteTable, text, integer, unique, blob } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  username: text("username").unique(),
  name: text("name").default("").notNull(),
  contactNumber: text("contact_number"),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "team_manager"] }).notNull(),
  teamId: integer("team_id").references(() => teams.id, { onDelete: "set null" }),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const seasons = sqliteTable("seasons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
  status: text("status", { enum: ["draft", "active", "ended"] }).default("draft").notNull(),
});

export const divisions = sqliteTable("divisions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seasonId: integer("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (t) => ({
  uniqueDivisionName: unique().on(t.seasonId, t.name),
}));

export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  divisionId: integer("division_id").notNull().references(() => divisions.id, { onDelete: "cascade" }),
  imageMimeType: text("image_mime_type"),
  imageData: blob("image_data", { mode: "buffer" }),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const players = sqliteTable("players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  jerseyNumber: integer("jersey_number").notNull(),
  position: text("position", { enum: ["PG", "SG", "SF", "PF", "C"] }).notNull(),
  height: text("height"),
  contactNumber: text("contact_number"),
  imageMimeType: text("image_mime_type"),
  imageData: blob("image_data", { mode: "buffer" }),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (t) => ({
  uniqueJersey: unique().on(t.teamId, t.jerseyNumber),
}));

export const matches = sqliteTable("matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seasonId: integer("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
  divisionId: integer("division_id").references(() => divisions.id, { onDelete: "set null" }),
  homeTeamId: integer("home_team_id").references(() => teams.id, { onDelete: "set null" }),
  awayTeamId: integer("away_team_id").references(() => teams.id, { onDelete: "set null" }),
  scheduledAt: text("scheduled_at"),
  venue: text("venue"),
  status: text("status", { enum: ["planned", "scheduled", "started", "live", "ended"] }).notNull().default("planned"),
  homeScore: integer("home_score").default(0).notNull(),
  awayScore: integer("away_score").default(0).notNull(),
  agoraChannel: text("agora_channel"),
});

// A bracket is a single-elimination draw drawn by the admin on the canvas.
// One bracket per division may be the default (governs auto-placement of new teams).
export const brackets = sqliteTable("brackets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  divisionId: integer("division_id").notNull().references(() => divisions.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).default(false).notNull(),
  isPublished: integer("is_published", { mode: "boolean" }).default(false).notNull(),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

// A bracket_match positions one match within a bracket's round/slot grid and
// records which next-round box its winner feeds into.
export const bracketMatches = sqliteTable("bracket_matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bracketId: integer("bracket_id").notNull().references(() => brackets.id, { onDelete: "cascade" }),
  matchId: integer("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
  roundIndex: integer("round_index").notNull(),
  slotIndex: integer("slot_index").notNull(),
  feedsIntoId: integer("feeds_into_id").references((): AnySQLiteColumn => bracketMatches.id, { onDelete: "set null" }),
});

export const announcements = sqliteTable("announcements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const announcementImages = sqliteTable("announcement_images", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  announcementId: integer("announcement_id").references(() => announcements.id, { onDelete: "cascade" }),
  mimeType: text("mime_type").notNull(),
  data: blob("data", { mode: "buffer" }).notNull(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type Season = typeof seasons.$inferSelect;
export type Division = typeof divisions.$inferSelect;
export type NewDivision = typeof divisions.$inferInsert;
export type Bracket = typeof brackets.$inferSelect;
export type NewBracket = typeof brackets.$inferInsert;
export type BracketMatch = typeof bracketMatches.$inferSelect;
export type NewBracketMatch = typeof bracketMatches.$inferInsert;
export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;
export type AnnouncementImage = typeof announcementImages.$inferSelect;
export type NewAnnouncementImage = typeof announcementImages.$inferInsert;
