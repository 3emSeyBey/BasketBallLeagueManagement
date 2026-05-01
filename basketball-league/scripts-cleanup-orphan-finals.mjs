// Delete finals matches (divisionId IS NULL) that exist for active seasons
// where no division has a winner yet.
//
// Definition of "winner": the division has at least one ended match marked
// isDivisionFinal=1 with a higher score on one side.
//
// Usage: node --env-file=.env.local scripts-cleanup-orphan-finals.mjs

import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL ?? process.env.TURSO_DATABASE_URL;
const authToken =
  process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const c = createClient({ url, authToken });

async function main() {
  const seasons = await c.execute(
    "SELECT id, name, status FROM seasons WHERE status IN ('active','draft')",
  );

  let totalDeleted = 0;
  for (const s of seasons.rows) {
    const seasonId = s.id;

    const winnersRow = await c.execute({
      sql: `
        SELECT COUNT(*) AS n
        FROM matches
        WHERE season_id = ?
          AND division_id IS NOT NULL
          AND is_division_final = 1
          AND status = 'ended'
          AND home_score <> away_score
      `,
      args: [seasonId],
    });
    const winners = Number(winnersRow.rows[0].n);

    if (winners === 0) {
      const finalsRow = await c.execute({
        sql: `
          SELECT id, agora_channel, home_team_id, away_team_id, status
          FROM matches
          WHERE season_id = ?
            AND division_id IS NULL
        `,
        args: [seasonId],
      });
      if (finalsRow.rows.length === 0) {
        console.log(
          `Season ${seasonId} (${s.name}): no winners, no finals matches → ok`,
        );
        continue;
      }
      console.log(
        `Season ${seasonId} (${s.name}): no winners, deleting ${finalsRow.rows.length} finals matches`,
      );
      for (const m of finalsRow.rows) {
        console.log(`  - match ${m.id} (${m.agora_channel}, ${m.status})`);
      }
      const del = await c.execute({
        sql: `
          DELETE FROM matches
          WHERE season_id = ?
            AND division_id IS NULL
        `,
        args: [seasonId],
      });
      totalDeleted += Number(del.rowsAffected ?? 0);
    } else {
      console.log(
        `Season ${seasonId} (${s.name}): ${winners} division winner(s) — finals retained`,
      );
    }
  }

  console.log(`Done. Deleted ${totalDeleted} match row(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
