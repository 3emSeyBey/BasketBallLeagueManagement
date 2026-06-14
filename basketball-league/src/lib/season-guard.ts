import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { seasons, divisions, teams, brackets, matches } from "@/db/schema";

export class SeasonLockedError extends Error {
  constructor() { super("This season is archived and read-only."); }
}

// Throw if the season is ended (archived). Used to lock mutations on ended seasons.
export async function assertSeasonEditable(seasonId: number): Promise<void> {
  const s = await db.query.seasons.findFirst({ where: eq(seasons.id, seasonId) });
  if (s?.status === "ended") throw new SeasonLockedError();
}

export async function assertDivisionEditable(divisionId: number): Promise<void> {
  const d = await db.query.divisions.findFirst({ where: eq(divisions.id, divisionId) });
  if (d) await assertSeasonEditable(d.seasonId);
}

export async function assertTeamEditable(teamId: number): Promise<void> {
  const t = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  if (t) await assertDivisionEditable(t.divisionId);
}

export async function assertBracketEditable(bracketId: number): Promise<void> {
  const b = await db.query.brackets.findFirst({ where: eq(brackets.id, bracketId) });
  if (b) await assertDivisionEditable(b.divisionId);
}

export async function assertMatchEditable(matchId: number): Promise<void> {
  const m = await db.query.matches.findFirst({ where: eq(matches.id, matchId) });
  if (m) await assertSeasonEditable(m.seasonId);
}
