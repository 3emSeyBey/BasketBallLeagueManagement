import { sql } from "drizzle-orm";
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

export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  division: text("division", { enum: ["A", "B"] }).notNull(),
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

export const seasons = sqliteTable("seasons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
  status: text("status", { enum: ["draft", "active", "ended"] }).default("draft").notNull(),
  bracketType: text("bracket_type", { enum: ["single_elim"] }).default("single_elim").notNull(),
  thirdPlaceMatch: integer("third_place_match", { mode: "boolean" }).default(false).notNull(),
});

export const divisions = sqliteTable("divisions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seasonId: integer("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (t) => ({
  uniqueDivisionName: unique().on(t.seasonId, t.name),
}));

export const seasonTeams = sqliteTable("season_teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seasonId: integer("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
  teamId: integer("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  divisionId: integer("division_id").references(() => divisions.id, { onDelete: "set null" }),
  seed: integer("seed"),
}, (t) => ({
  uniqueSeasonTeam: unique().on(t.seasonId, t.teamId),
}));

export const matches = sqliteTable("matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seasonId: integer("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
  divisionId: integer("division_id").references(() => divisions.id, { onDelete: "set null" }),
  homeTeamId: integer("home_team_id").references(() => teams.id, { onDelete: "set null" }),
  awayTeamId: integer("away_team_id").references(() => teams.id, { onDelete: "set null" }),
  scheduledAt: text("scheduled_at").notNull(),
  venue: text("venue").notNull(),
  status: text("status", { enum: ["scheduled", "live", "final"] }).notNull().default("scheduled"),
  homeScore: integer("home_score").default(0).notNull(),
  awayScore: integer("away_score").default(0).notNull(),
  agoraChannel: text("agora_channel"),
  round: integer("round"),
  stage: text("stage", { enum: ["pool", "playoff", "final"] }),
  isDivisionFinal: integer("is_division_final", { mode: "boolean" }).default(false).notNull(),
  isSeasonFinal: integer("is_season_final", { mode: "boolean" }).default(false).notNull(),
  bracketPosition: integer("bracket_position"),
  nextMatchId: integer("next_match_id"),
  nextMatchSlot: text("next_match_slot", { enum: ["home", "away"] }),
});

export const finalsEliminations = sqliteTable("finals_eliminations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seasonId: integer("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
  teamId: integer("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  eliminatedAt: text("eliminated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (t) => ({
  uniqueSeasonTeam: unique().on(t.seasonId, t.teamId),
}));

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
export type SeasonTeam = typeof seasonTeams.$inferSelect;
export type NewSeasonTeam = typeof seasonTeams.$inferInsert;
export type Division = typeof divisions.$inferSelect;
export type NewDivision = typeof divisions.$inferInsert;
export type FinalsElimination = typeof finalsEliminations.$inferSelect;
export type NewFinalsElimination = typeof finalsEliminations.$inferInsert;
export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;
export type AnnouncementImage = typeof announcementImages.$inferSelect;
export type NewAnnouncementImage = typeof announcementImages.$inferInsert;
