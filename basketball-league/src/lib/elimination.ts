import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches, seasonTeams, finalsEliminations } from "@/db/schema";
import { isDivisionLocked, isFinalsLocked } from "./division-lock";

export type TeamStatus = "active" | "tentative_eliminated" | "permanent_eliminated" | "champion";

/**
 * Compute the elimination status of a team in a season's division bracket.
 * Rules:
 *  - Lost a playoff (round 2+) match → permanent_eliminated.
 *  - Lost a pool match and division pool is locked → permanent_eliminated.
 *  - Lost a pool match and pool is still open → tentative_eliminated
 *    (admin can revive by composing another pool match).
 *  - Otherwise → active.
 *
 * `champion` is reserved for the team that has a `final` won-match flagged
 * `is_season_final = true` in the season.
 */
export async function computeDivisionStatus(
  seasonId: number,
  divisionId: number,
  teamId: number,
): Promise<TeamStatus> {
  const teamMatches = await db
    .select({
      stage: matches.stage,
      status: matches.status,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
    })
    .from(matches)
    .where(and(
      eq(matches.seasonId, seasonId),
      eq(matches.divisionId, divisionId),
    ));

  let lostInPool = false;
  let lostInPlayoff = false;
  for (const m of teamMatches) {
    if (m.status !== "final") continue;
    const isHome = m.homeTeamId === teamId;
    const isAway = m.awayTeamId === teamId;
    if (!isHome && !isAway) continue;
    const myScore = isHome ? m.homeScore : m.awayScore;
    const oppScore = isHome ? m.awayScore : m.homeScore;
    if (myScore >= oppScore) continue; // win or tie
    if (m.stage === "pool") lostInPool = true;
    else if (m.stage === "playoff") lostInPlayoff = true;
  }

  if (lostInPlayoff) return "permanent_eliminated";
  if (lostInPool) {
    const locked = await isDivisionLocked(seasonId, divisionId);
    return locked ? "permanent_eliminated" : "tentative_eliminated";
  }
  return "active";
}

/**
 * Finals status for a team representing a division.
 * Reads `finals_eliminations` for manual overrides + applies pool-lock rule.
 */
export async function computeFinalsStatus(
  seasonId: number,
  teamId: number,
): Promise<TeamStatus> {
  const [manual] = await db
    .select({ id: finalsEliminations.id })
    .from(finalsEliminations)
    .where(and(eq(finalsEliminations.seasonId, seasonId), eq(finalsEliminations.teamId, teamId)))
    .limit(1);
  if (manual) return "permanent_eliminated";

  const finalsMatches = await db
    .select({
      stage: matches.stage,
      status: matches.status,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
    })
    .from(matches)
    .where(and(eq(matches.seasonId, seasonId)));

  let lostInPool = false;
  let lostInPlayoff = false;
  for (const m of finalsMatches.filter(x => x.stage !== null)) {
    if (m.status !== "final") continue;
    const isHome = m.homeTeamId === teamId;
    const isAway = m.awayTeamId === teamId;
    if (!isHome && !isAway) continue;
    const myScore = isHome ? m.homeScore : m.awayScore;
    const oppScore = isHome ? m.awayScore : m.homeScore;
    if (myScore >= oppScore) continue;
    if (m.stage === "pool") lostInPool = true;
    else if (m.stage === "playoff") lostInPlayoff = true;
  }

  if (lostInPlayoff) return "permanent_eliminated";
  if (lostInPool) {
    const locked = await isFinalsLocked(seasonId);
    return locked ? "permanent_eliminated" : "tentative_eliminated";
  }
  return "active";
}

/**
 * Active (non-eliminated) team IDs in a division — useful for the canvas
 * to know who can still be matched.
 */
export async function activeTeamsInDivision(
  seasonId: number,
  divisionId: number,
): Promise<number[]> {
  const rows = await db
    .select({ teamId: seasonTeams.teamId })
    .from(seasonTeams)
    .where(and(eq(seasonTeams.seasonId, seasonId), eq(seasonTeams.divisionId, divisionId)));
  const out: number[] = [];
  for (const r of rows) {
    const status = await computeDivisionStatus(seasonId, divisionId, r.teamId);
    if (status === "active" || status === "tentative_eliminated") out.push(r.teamId);
  }
  return out;
}
