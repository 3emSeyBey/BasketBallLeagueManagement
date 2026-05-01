import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches, seasonTeams, teams } from "@/db/schema";

export type BracketTeam = { id: number; name: string; division: string };

export type BracketMatchView = {
  id: number;
  round: number;
  position: number;
  homeTeam: BracketTeam | null;
  awayTeam: BracketTeam | null;
  homeScore: number;
  awayScore: number;
  status: "planned" | "scheduled" | "started" | "live" | "ended";
  scheduledAt: string | null;
};

export async function loadBracket(seasonId: number) {
  const [seedRows, matchRows] = await Promise.all([
    db.select({
      seed: seasonTeams.seed,
      teamId: seasonTeams.teamId,
      teamName: teams.name,
      division: teams.division,
    })
      .from(seasonTeams)
      .leftJoin(teams, eq(teams.id, seasonTeams.teamId))
      .where(eq(seasonTeams.seasonId, seasonId)),
    db.select({
      id: matches.id,
      round: matches.round,
      position: matches.bracketPosition,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      status: matches.status,
      scheduledAt: matches.scheduledAt,
    })
      .from(matches)
      .where(and(eq(matches.seasonId, seasonId))),
  ]);

  const teamRows = await db.select().from(teams);
  const teamById = new Map<number, BracketTeam>(
    teamRows.map(t => [t.id, { id: t.id, name: t.name, division: t.division }])
  );

  const seeds = seedRows
    .filter(r => r.teamId !== null)
    .sort((a, b) => (a.seed ?? Number.MAX_SAFE_INTEGER) - (b.seed ?? Number.MAX_SAFE_INTEGER))
    .map(r => ({
      seed: r.seed ?? 0,
      teamId: r.teamId,
      teamName: r.teamName ?? "Unknown",
      division: r.division ?? "A",
    }));

  const bracketMatches: BracketMatchView[] = matchRows
    .filter(m => m.round !== null && m.position !== null)
    .map(m => ({
      id: m.id,
      round: m.round!,
      position: m.position!,
      homeTeam: m.homeTeamId ? teamById.get(m.homeTeamId) ?? null : null,
      awayTeam: m.awayTeamId ? teamById.get(m.awayTeamId) ?? null : null,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
      scheduledAt: m.scheduledAt,
    }))
    .sort((a, b) => a.round - b.round || a.position - b.position);

  return { seeds, matches: bracketMatches };
}
