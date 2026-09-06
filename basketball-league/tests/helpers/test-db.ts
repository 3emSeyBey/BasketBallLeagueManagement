import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";

// Minimal DDL for the tables the bracket service touches. Mirrors src/db/schema.ts.
const DDL = [
  `CREATE TABLE seasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
  );`,
  `CREATE TABLE divisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    UNIQUE(season_id, name)
  );`,
  `CREATE TABLE teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    division_id INTEGER NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
    image_mime_type TEXT,
    image_data BLOB,
    logo_color TEXT,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    UNIQUE(division_id, name)
  );`,
  `CREATE TABLE matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    division_id INTEGER REFERENCES divisions(id) ON DELETE SET NULL,
    home_team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    away_team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    scheduled_at TEXT,
    venue TEXT,
    status TEXT NOT NULL DEFAULT 'planned',
    home_score INTEGER NOT NULL DEFAULT 0,
    away_score INTEGER NOT NULL DEFAULT 0,
    agora_channel TEXT,
    broadcaster_user_id INTEGER
  );`,
  `CREATE TABLE brackets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    division_id INTEGER NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    is_published INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  );`,
  `CREATE TABLE bracket_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bracket_id INTEGER NOT NULL REFERENCES brackets(id) ON DELETE CASCADE,
    match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    round_index INTEGER NOT NULL,
    slot_index INTEGER NOT NULL,
    feeds_into_id INTEGER REFERENCES bracket_matches(id) ON DELETE SET NULL
  );`,
  `CREATE TABLE players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    jersey_number INTEGER NOT NULL,
    position TEXT NOT NULL,
    height TEXT,
    contact_number TEXT,
    image_mime_type TEXT,
    image_data BLOB,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    UNIQUE(team_id, jersey_number)
  );`,
  `CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    username TEXT UNIQUE,
    name TEXT NOT NULL DEFAULT '',
    contact_number TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    team_id INTEGER,
    requested_team_name TEXT,
    requested_division_id INTEGER,
    requested_team_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  );`,
  `CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    actor_label TEXT NOT NULL,
    action TEXT NOT NULL,
    outcome TEXT NOT NULL DEFAULT 'success',
    target_type TEXT,
    target_id INTEGER,
    meta TEXT,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  );`,
];

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

export async function makeTestDb(): Promise<TestDb> {
  const client = createClient({ url: ":memory:" });
  for (const stmt of DDL) await client.execute(stmt);
  return drizzle(client, { schema });
}

export async function seedSeasonDivision(db: TestDb) {
  const [season] = await db.insert(schema.seasons).values({ name: "S1", startedAt: "2026-01-01T00:00:00.000Z" }).returning();
  const [division] = await db.insert(schema.divisions).values({ seasonId: season.id, name: "D1" }).returning();
  return { season, division };
}

export async function addTeam(db: TestDb, divisionId: number, name: string) {
  const [team] = await db.insert(schema.teams).values({ name, divisionId }).returning();
  return team;
}
