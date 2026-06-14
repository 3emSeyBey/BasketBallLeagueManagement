import { and, eq, inArray } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";
import { seasons, divisions, teams, players, users } from "@/db/schema";

type Database = LibSQLDatabase<typeof schema>;

export type ImportSelection = { teamId: number; includeRoster: boolean };

// Copy selected teams from a source season into the target, recreating their
// divisions by name. Optionally copies each team's roster, and always carries
// the source team's manager over to the new team.
export async function importTeams(
  db: Database,
  targetSeasonId: number,
  sourceSeasonId: number,
  selections: ImportSelection[],
): Promise<void> {
  if (selections.length === 0) return;

  const srcTeams = await db.select().from(teams).where(inArray(teams.id, selections.map((s) => s.teamId)));
  const srcDivs = await db.select().from(divisions).where(eq(divisions.seasonId, sourceSeasonId));
  const srcDivById = new Map(srcDivs.map((d) => [d.id, d]));
  const tgtDivs = await db.select().from(divisions).where(eq(divisions.seasonId, targetSeasonId));
  const tgtDivByName = new Map(tgtDivs.map((d) => [d.name, d.id]));
  const rosterFlag = new Map(selections.map((s) => [s.teamId, s.includeRoster]));

  for (const t of srcTeams) {
    const srcDiv = srcDivById.get(t.divisionId);
    if (!srcDiv) continue; // team isn't part of the source season

    let tgtDivId = tgtDivByName.get(srcDiv.name);
    if (tgtDivId == null) {
      const [d] = await db.insert(divisions).values({ seasonId: targetSeasonId, name: srcDiv.name }).returning();
      tgtDivId = d.id;
      tgtDivByName.set(srcDiv.name, d.id);
    }

    const exists = await db.query.teams.findFirst({ where: and(eq(teams.divisionId, tgtDivId), eq(teams.name, t.name)) });
    if (exists) continue;

    const [newTeam] = await db.insert(teams).values({
      name: t.name,
      divisionId: tgtDivId,
      imageMimeType: t.imageMimeType,
      imageData: t.imageData,
      logoColor: t.logoColor,
    }).returning();

    if (rosterFlag.get(t.id)) {
      const roster = await db.select().from(players).where(eq(players.teamId, t.id));
      for (const p of roster) {
        await db.insert(players).values({
          teamId: newTeam.id,
          name: p.name,
          jerseyNumber: p.jerseyNumber,
          position: p.position,
          height: p.height,
          contactNumber: p.contactNumber,
          imageMimeType: p.imageMimeType,
          imageData: p.imageData,
        });
      }
    }

    // Carry the manager over to the new team (accounts persist across seasons).
    const mgr = await db.query.users.findFirst({ where: eq(users.teamId, t.id) });
    if (mgr) await db.update(users).set({ teamId: newTeam.id }).where(eq(users.id, mgr.id));
  }
}

// Activate a draft season: end the currently active season, then mark this one
// active with the chosen start date. One active season at a time.
export async function activateSeason(db: Database, seasonId: number, startedAt: string): Promise<void> {
  await db.update(seasons)
    .set({ status: "ended", endedAt: new Date().toISOString() })
    .where(eq(seasons.status, "active"));
  await db.update(seasons)
    .set({ status: "active", startedAt })
    .where(eq(seasons.id, seasonId));
}

export async function endSeason(db: Database, seasonId: number): Promise<void> {
  await db.update(seasons)
    .set({ status: "ended", endedAt: new Date().toISOString() })
    .where(eq(seasons.id, seasonId));
}
