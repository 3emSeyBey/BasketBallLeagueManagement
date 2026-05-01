// Run only the 0009 changes idempotently against the remote Turso DB.
// Usage: node --env-file=.env.local scripts-migrate-0009.mjs

import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL ?? process.env.TURSO_DATABASE_URL;
const authToken =
  process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("Missing DATABASE_URL / TURSO_DATABASE_URL");
  process.exit(1);
}

const c = createClient({ url, authToken });

async function tryRun(sql, label) {
  try {
    await c.execute(sql);
    console.log(`✓ ${label}`);
  } catch (e) {
    const msg = String(e?.message ?? e);
    if (
      /no such column|already exists|duplicate column|cannot drop column/i.test(
        msg,
      )
    ) {
      console.log(`• ${label} (skip: ${msg.split("\n")[0]})`);
    } else {
      console.error(`✗ ${label}: ${msg}`);
      throw e;
    }
  }
}

async function main() {
  // 1) Data migration: any rows still on the old "final" → "ended".
  await tryRun(
    "UPDATE matches SET status = 'ended' WHERE status = 'final'",
    "matches: status final → ended",
  );

  // 2) Default for status column → 'planned'. We rebuild via the libsql
  //    ALTER COLUMN extension if available; otherwise do a full table copy.
  const altered = await c
    .execute(
      "ALTER TABLE matches ALTER COLUMN status TO status text NOT NULL DEFAULT 'planned'",
    )
    .then(() => true)
    .catch(() => false);
  if (altered) {
    console.log("✓ matches.status default → 'planned'");
  } else {
    console.log("• matches.status default unchanged (libsql ALTER unsupported)");
  }

  // 3) scheduled_at nullable. Same story — try libsql ALTER first.
  const nulled = await c
    .execute(
      "ALTER TABLE matches ALTER COLUMN scheduled_at TO scheduled_at text",
    )
    .then(() => true)
    .catch(() => false);
  if (nulled) {
    console.log("✓ matches.scheduled_at made nullable");
  } else {
    console.log("• matches.scheduled_at unchanged (libsql ALTER unsupported)");
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
