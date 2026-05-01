// Reschedule the 9 reverted Season 2025 playoff matches to Tuesdays
// starting 2026-05-06, one per week, in round order (R2 -> R3 -> R4).
//
// Match order (by round, then id) — this is the same order the bracket
// progresses, so weekly cadence respects the advancement rule:
//   R2: 68, 71, 76, 77, 81
//   R3: 78, 82, 83
//   R4: 84  (championship)
//
// Usage:
//   node --env-file=.env.local scripts-reschedule-reverted.mjs           # dry
//   node --env-file=.env.local scripts-reschedule-reverted.mjs --apply

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

const ORDER = [68, 71, 76, 77, 81, 78, 82, 83, 84];
const START = new Date(Date.UTC(2026, 4, 6, 18, 0, 0)); // 2026-05-06 18:00 UTC

async function exec(label, sql, args = []) {
  if (!APPLY) {
    console.log(`DRY ${label}: ${sql.replace(/\s+/g, " ").trim()} ${JSON.stringify(args)}`);
    return;
  }
  const r = await c.execute({ sql, args });
  console.log(`✓ ${label} (${r.rowsAffected ?? 0} rows)`);
}

async function main() {
  for (let i = 0; i < ORDER.length; i++) {
    const id = ORDER[i];
    const dt = new Date(START.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const iso = dt.toISOString();
    await exec(
      `match ${id} -> ${iso}`,
      "UPDATE matches SET scheduled_at = ? WHERE id = ?",
      [iso, id],
    );
  }
  console.log(
    APPLY
      ? "\nApplied. All 9 matches now scheduled weekly from 2026-05-06."
      : "\nDry run. Re-run with --apply.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
