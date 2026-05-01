// Randomize the time-of-day on the 9 rescheduled matches to a random hour
// between 13:00 and 20:00 local time (Asia/Manila, UTC+8).
//
// Stored as ISO/UTC so the browser renders the same wall-clock time for
// PH-based viewers.
//
// Usage:
//   node --env-file=.env.local scripts-randomize-times.mjs           # dry
//   node --env-file=.env.local scripts-randomize-times.mjs --apply

import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL ?? process.env.TURSO_DATABASE_URL;
const authToken =
  process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;
const APPLY = process.argv.includes("--apply");

if (!url) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const c = createClient({ url, authToken });

const IDS = [68, 71, 76, 77, 81, 78, 82, 83, 84];
const TZ_OFFSET_HOURS = 8; // Asia/Manila

function randomLocalHour() {
  // 13..20 inclusive (8 buckets), random minute 0/15/30/45 for variety.
  const hour = 13 + Math.floor(Math.random() * 8);
  const minute = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
  return { hour, minute };
}

async function exec(label, sql, args = []) {
  if (!APPLY) {
    console.log(`DRY ${label}: ${sql.replace(/\s+/g, " ").trim()} ${JSON.stringify(args)}`);
    return;
  }
  const r = await c.execute({ sql, args });
  console.log(`✓ ${label} (${r.rowsAffected ?? 0} rows)`);
}

async function main() {
  const rows = await c.execute({
    sql: `SELECT id, scheduled_at FROM matches WHERE id IN (${IDS.map(() => "?").join(",")})`,
    args: IDS,
  });

  for (const row of rows.rows) {
    const id = Number(row.id);
    const cur = String(row.scheduled_at);
    const d = new Date(cur);
    if (Number.isNaN(d.getTime())) {
      console.log(`! match ${id}: invalid scheduled_at ${cur}, skipping`);
      continue;
    }

    const { hour, minute } = randomLocalHour();
    // Build the local PHT time at the existing date, convert to UTC by
    // subtracting the timezone offset.
    const local = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour, minute, 0),
    );
    local.setUTCHours(local.getUTCHours() - TZ_OFFSET_HOURS);
    const iso = local.toISOString();

    const localStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} PHT`;
    console.log(`  match ${id}: ${cur} -> ${iso}  (${localStr})`);

    await exec(
      `match ${id} time`,
      "UPDATE matches SET scheduled_at = ? WHERE id = ?",
      [iso, id],
    );
  }

  console.log(
    APPLY
      ? "\nApplied. Times randomized 13:00–20:00 PHT."
      : "\nDry run. Re-run with --apply.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
