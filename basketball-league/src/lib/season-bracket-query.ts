import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  matches, divisions as divisionsTable, seasonTeams, teams, finalsEliminations,
} from "@/db/schema";
import { isDivisionLocked, isFinalsLocked } from "./division-lock";
import { computeDivisionStatus, computeFinalsStatus, type TeamStatus } from "./elimination";

export type CanvasTeam = {
  id: number;
  name: string;
};

export type CanvasMatch = {
  id: number;
  seasonId: number;
  divisionId: number | null;
  stage: "pool" | "playoff" | "final";
  round: number;
  homeTeam: CanvasTeam | null;
  awayTeam: CanvasTeam | null;
  homeScore: number;
  awayScore: number;
  status: "planned" | "scheduled" | "started" | "live" | "ended";
  scheduledAt: string | null;
  venue: string;
  isDivisionFinal: boolean;
  isSeasonFinal: boolean;
};

export type CanvasDivision = {
  id: number;
  name: string;
  locked: boolean;
  divisionWinner: CanvasTeam | null;
  teams: { team: CanvasTeam; status: TeamStatus }[];
  matches: CanvasMatch[];
};

export type CanvasFinals = {
  locked: boolean;
  championTeam: CanvasTeam | null;
  matches: CanvasMatch[];
  // teams in finals = winners of each division (so far)
  teams: { team: CanvasTeam; status: TeamStatus }[];
};

export type CanvasView = {
  divisions: CanvasDivision[];
  finals: CanvasFinals;
};

export async function loadCanvas(seasonId: number): Promise<CanvasView> {
  const allTeams = await db.select().from(teams);
  const teamById = new Map<number, CanvasTeam>(
    allTeams.map(t => [t.id, { id: t.id, name: t.name }]),
  );

  const teamRef = (id: number | null): CanvasTeam | null => (id == null ? null : teamById.get(id) ?? null);

  const seasonDivs = await db
    .select()
    .from(divisionsTable)
    .where(eq(divisionsTable.seasonId, seasonId))
    .orderBy(asc(divisionsTable.name));

  const enrolledRows = await db
    .select()
    .from(seasonTeams)
    .where(eq(seasonTeams.seasonId, seasonId));

  const allMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.seasonId, seasonId))
    .orderBy(asc(matches.round), asc(matches.id));

  const toCanvasMatch = (m: typeof allMatches[number]): CanvasMatch => ({
    id: m.id,
    seasonId: m.seasonId,
    divisionId: m.divisionId,
    stage: (m.stage ?? "pool") as "pool" | "playoff" | "final",
    round: m.round ?? 1,
    homeTeam: teamRef(m.homeTeamId),
    awayTeam: teamRef(m.awayTeamId),
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    status: m.status,
    scheduledAt: m.scheduledAt,
    venue: m.venue,
    isDivisionFinal: m.isDivisionFinal,
    isSeasonFinal: m.isSeasonFinal,
  });

  const divisionsOut: CanvasDivision[] = [];
  for (const d of seasonDivs) {
    const divisionEnrolled = enrolledRows.filter(r => r.divisionId === d.id);
    const teamsWithStatus = await Promise.all(divisionEnrolled.map(async r => {
      const team = teamById.get(r.teamId);
      if (!team) return null;
      const status = await computeDivisionStatus(seasonId, d.id, r.teamId);
      return { team, status };
    }));

    const matchesInDiv = allMatches.filter(m => m.divisionId === d.id).map(toCanvasMatch);
    const finalsMatch = matchesInDiv.find(m => m.isDivisionFinal && m.status === "ended");
    let divisionWinner: CanvasTeam | null = null;
    if (finalsMatch) {
      if (finalsMatch.homeScore > finalsMatch.awayScore) divisionWinner = finalsMatch.homeTeam;
      else if (finalsMatch.awayScore > finalsMatch.homeScore) divisionWinner = finalsMatch.awayTeam;
    }

    divisionsOut.push({
      id: d.id,
      name: d.name,
      locked: await isDivisionLocked(seasonId, d.id),
      divisionWinner,
      teams: teamsWithStatus.filter((x): x is { team: CanvasTeam; status: TeamStatus } => x !== null),
      matches: matchesInDiv,
    });
  }

  // Finals = matches with divisionId IS NULL
  const finalsMatches = allMatches.filter(m => m.divisionId === null && m.stage !== null).map(toCanvasMatch);
  const championMatch = finalsMatches.find(m => m.isSeasonFinal && m.status === "ended");
  let championTeam: CanvasTeam | null = null;
  if (championMatch) {
    if (championMatch.homeScore > championMatch.awayScore) championTeam = championMatch.homeTeam;
    else if (championMatch.awayScore > championMatch.homeScore) championTeam = championMatch.awayTeam;
  }

  // Finals teams = each division's winner so far + manually eliminated overrides
  const finalsTeamIds = new Set<number>();
  for (const d of divisionsOut) {
    if (d.divisionWinner) finalsTeamIds.add(d.divisionWinner.id);
  }
  // Also include any team currently active in a finals match.
  for (const m of finalsMatches) {
    if (m.homeTeam) finalsTeamIds.add(m.homeTeam.id);
    if (m.awayTeam) finalsTeamIds.add(m.awayTeam.id);
  }
  const manuals = await db
    .select()
    .from(finalsEliminations)
    .where(eq(finalsEliminations.seasonId, seasonId));
  const finalsTeams = await Promise.all(
    Array.from(finalsTeamIds).map(async id => {
      const team = teamById.get(id);
      if (!team) return null;
      const status = manuals.some(m => m.teamId === id)
        ? ("permanent_eliminated" as TeamStatus)
        : await computeFinalsStatus(seasonId, id);
      return { team, status };
    }),
  );

  return {
    divisions: divisionsOut,
    finals: {
      locked: await isFinalsLocked(seasonId),
      championTeam,
      matches: finalsMatches,
      teams: finalsTeams.filter((x): x is { team: CanvasTeam; status: TeamStatus } => x !== null),
    },
  };
}

// Avoid unused-import error if downstream needs it
export { eq, and };
