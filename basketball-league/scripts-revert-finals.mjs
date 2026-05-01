// Revert recent end-of-season state for the active season so the bracket
// looks like a season in progress.
//
// Behavior:
//   • Re-activate the most-recent season (status -> "active", clear endedAt)
//   • Reset stray scores on scheduled matches to 0-0
//   • Reset late playoff matches (round >= 2 by default) back to scheduled
//     with 0-0 scores, leaving the resolved teams in place so the bracket
//     still renders the correct matchups.
//
// Usage:
//   node --env-file=.env.local scripts-revert-finals.mjs           # dry run
//   node --env-file=.env.local scripts-revert-finals.mjs --apply   # commit

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

async function exec(label, sql, args = []) {
  if (!APPLY) {
    console.log(`DRY ${label}: ${sql.replace(/\s+/g, " ").trim()} ${JSON.stringify(args)}`);
    return;
  }
  const r = await c.execute({ sql, args });
  console.log(`✓ ${label} (${r.rowsAffected ?? 0} rows)`);
}

async function main() {
  const seasonsRow = await c.execute(
    "SELECT id, name, status FROM seasons ORDER BY id DESC LIMIT 1",
  );
  if (seasonsRow.rows.length === 0) {
    console.log("No season rows.");
    return;
  }
  const target = seasonsRow.rows[0];
  console.log(`Target season: ${target.id} (${target.name}, status=${target.status})\n`);

  // 1) Re-activate season.
  await exec(
    "season -> active",
    "UPDATE seasons SET status='active', ended_at=NULL WHERE id=?",
    [target.id],
  );

  // 2) Stray scores on scheduled matches → 0-0.
  const stray = await c.execute({
    sql: `
      SELECT id, home_score AS hs, away_score AS as_, status
      FROM matches
      WHERE season_id = ?
        AND status = 'scheduled'
        AND (home_score <> 0 OR away_score <> 0)
    `,
    args: [target.id],
  });
  for (const r of stray.rows) {
    console.log(`  stray score on scheduled match ${r.id}: ${r.hs}-${r.as_}`);
  }
  await exec(
    "scheduled scores -> 0-0",
    `
      UPDATE matches
         SET home_score = 0, away_score = 0
       WHERE season_id = ?
         AND status = 'scheduled'
         AND (home_score <> 0 OR away_score <> 0)
    `,
    [target.id],
  );

  // 3) Revert late playoff matches (round >= 2) to scheduled.
  const late = await c.execute({
    sql: `
      SELECT id, round, status, home_score AS hs, away_score AS as_, is_division_final, is_season_final
      FROM matches
      WHERE season_id = ?
        AND round >= 2
        AND status = 'ended'
    `,
    args: [target.id],
  });
  for (const r of late.rows) {
    const tag = r.is_season_final ? "[SF]" : r.is_division_final ? "[DF]" : "    ";
    console.log(`  revert ${tag} match ${r.id} R${r.round}: ${r.hs}-${r.as_} ended -> scheduled 0-0`);
  }
  await exec(
    "round>=2 ended -> scheduled 0-0",
    `
      UPDATE matches
         SET status = 'scheduled', home_score = 0, away_score = 0
       WHERE season_id = ?
         AND round >= 2
         AND status = 'ended'
    `,
    [target.id],
  );

  console.log(
    APPLY
      ? "\nApplied. Reload /schedule to see updated bracket."
      : "\nDry run only. Re-run with --apply to commit.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
