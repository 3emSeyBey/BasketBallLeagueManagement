import type { Client } from "@libsql/client";

// Columns added after the initial deploy. drizzle-kit migrate fails against
// remote Turso (see reset.ts), so the server adds any that are missing at
// startup. Each entry must be a plain ADD COLUMN that is safe on existing rows.
const USER_COLUMNS: Record<string, string> = {
  session_version: "integer DEFAULT 0 NOT NULL",
  session_expires_at: "integer",
  failed_login_attempts: "integer DEFAULT 0 NOT NULL",
  locked_until: "integer",
};

export async function ensureSchema(client: Client): Promise<void> {
  const info = await client.execute("PRAGMA table_info(users)");
  if (info.rows.length === 0) return; // fresh DB; created by migrations/reset
  const existing = new Set(info.rows.map((r) => String(r.name)));
  for (const [name, type] of Object.entries(USER_COLUMNS)) {
    if (existing.has(name)) continue;
    try {
      await client.execute(`ALTER TABLE users ADD COLUMN ${name} ${type}`);
      console.log(`[ensureSchema] added users.${name}`);
    } catch (err) {
      // Another instance may have added it between the PRAGMA and the ALTER.
      if (!/duplicate column/i.test(String(err))) throw err;
    }
  }
}
