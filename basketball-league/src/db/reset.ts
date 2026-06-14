import { createClient } from "@libsql/client";

// Direct DDL reset. drizzle-kit migrate fails against remote Turso, so we drop
// and recreate the schema explicitly to match src/db/schema.ts, then seed.
const url = process.env.DATABASE_URL ?? "file:./dev.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;
const client = createClient({ url, authToken });

const DROP = [
  "announcement_images", "announcements", "bracket_matches", "brackets",
  "matches", "players", "teams", "divisions", "seasons",
  "finals_eliminations", "season_teams", "team_divisions", "users",
];

const CREATE = [
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
    broadcaster_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
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
  `CREATE TABLE announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  );`,
  `CREATE TABLE announcement_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE,
    mime_type TEXT NOT NULL,
    data BLOB NOT NULL,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  );`,
];

async function main() {
  await client.execute("PRAGMA foreign_keys = OFF;");
  for (const t of DROP) await client.execute(`DROP TABLE IF EXISTS ${t};`);
  for (const stmt of CREATE) await client.execute(stmt);
  await client.execute("PRAGMA foreign_keys = ON;");
  console.log("Schema reset complete.");
}

main().catch((e) => { console.error(e); process.exit(1); });
