import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { announcements, users, matches, teams, seasons } from "@/db/schema";

async function systemAuthorId(): Promise<number | null> {
  const admin = await db.query.users.findFirst({ where: eq(users.role, "admin") });
  return admin?.id ?? null;
}

export async function announceMatchResult(matchId: number) {
  const m = await db.query.matches.findFirst({ where: eq(matches.id, matchId) });
  if (!m || m.status !== "final" || m.homeTeamId == null || m.awayTeamId == null) return;
  const [home, away, season] = await Promise.all([
    db.query.teams.findFirst({ where: eq(teams.id, m.homeTeamId) }),
    db.query.teams.findFirst({ where: eq(teams.id, m.awayTeamId) }),
    db.query.seasons.findFirst({ where: eq(seasons.id, m.seasonId) }),
  ]);
  if (!home || !away) return;

  const winner = m.homeScore > m.awayScore ? home : away;
  const loser = winner.id === home.id ? away : home;
  const winScore = winner.id === home.id ? m.homeScore : m.awayScore;
  const loseScore = winner.id === home.id ? m.awayScore : m.homeScore;

  const roundLabel = m.round ? await roundLabelAsync(m.round, m.seasonId) : "";
  const seasonLabel = season ? ` — ${season.name}` : "";
  const title = m.round
    ? `${winner.name} advance past ${loser.name} in ${roundLabel}`
    : `${winner.name} defeat ${loser.name}`;
  const body = `<p><strong>${winner.name}</strong> beat <strong>${loser.name}</strong> ${winScore}–${loseScore}${roundLabel ? ` in the ${roundLabel}` : ""}${seasonLabel}.</p>`;

  const authorId = await systemAuthorId();
  if (authorId == null) return;
  await db.insert(announcements).values({
    title,
    body,
    createdBy: authorId,
  });
}

export async function announceChampion(seasonId: number, teamId: number) {
  const [season, team, authorId] = await Promise.all([
    db.query.seasons.findFirst({ where: eq(seasons.id, seasonId) }),
    db.query.teams.findFirst({ where: eq(teams.id, teamId) }),
    systemAuthorId(),
  ]);
  if (!season || !team || authorId == null) return;
  await db.insert(announcements).values({
    title: `${team.name} crowned ${season.name} champions`,
    body: `<p>🏆 Congratulations to <strong>${team.name}</strong> for winning the ${season.name} championship!</p>`,
    createdBy: authorId,
  });
}

export async function announceScheduleChange(matchId: number, prevDate: string | null, prevVenue: string | null) {
  const m = await db.query.matches.findFirst({ where: eq(matches.id, matchId) });
  if (!m) return;
  const [home, away] = await Promise.all([
    m.homeTeamId ? db.query.teams.findFirst({ where: eq(teams.id, m.homeTeamId) }) : Promise.resolve(null),
    m.awayTeamId ? db.query.teams.findFirst({ where: eq(teams.id, m.awayTeamId) }) : Promise.resolve(null),
  ]);
  const matchup = `${home?.name ?? "TBD"} vs ${away?.name ?? "TBD"}`;
  const newDate = new Date(m.scheduledAt).toLocaleString();
  const oldDate = prevDate ? new Date(prevDate).toLocaleString() : null;

  const lines: string[] = [];
  if (oldDate && oldDate !== newDate) lines.push(`Time: <s>${oldDate}</s> → <strong>${newDate}</strong>`);
  if (prevVenue && prevVenue !== m.venue) lines.push(`Venue: <s>${prevVenue}</s> → <strong>${m.venue}</strong>`);
  if (lines.length === 0) return;

  const authorId = await systemAuthorId();
  if (authorId == null) return;
  await db.insert(announcements).values({
    title: `Schedule update: ${matchup}`,
    body: `<p>${lines.join("<br>")}</p>`,
    createdBy: authorId,
  });
}

async function roundLabelAsync(round: number, seasonId: number): Promise<string> {
  const all = await db.select({ round: matches.round }).from(matches).where(eq(matches.seasonId, seasonId));
  const totalRounds = all.reduce((m, r) => Math.max(m, r.round ?? 0), 0);
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinals";
  if (fromEnd === 2) return "Quarterfinals";
  return `Round ${round}`;
}

/**
 * After a bracket match goes final, advance the winner to the next match slot.
 * Returns champion teamId if this was the final match (no nextMatchId).
 */
export async function advanceBracketWinner(matchId: number): Promise<{ championTeamId?: number; seasonId?: number }> {
  const m = await db.query.matches.findFirst({ where: eq(matches.id, matchId) });
  if (!m || m.status !== "final" || m.homeTeamId == null || m.awayTeamId == null) return {};
  const winnerId = m.homeScore > m.awayScore ? m.homeTeamId : m.awayTeamId;

  if (m.nextMatchId == null) {
    // Final match — winner is champion if this match is the highest round in the season
    const all = await db.select({ round: matches.round }).from(matches).where(eq(matches.seasonId, m.seasonId));
    const totalRounds = all.reduce((acc, r) => Math.max(acc, r.round ?? 0), 0);
    if (m.round === totalRounds) {
      return { championTeamId: winnerId, seasonId: m.seasonId };
    }
    return {};
  }

  const slot = m.nextMatchSlot ?? "home";
  await db.update(matches)
    .set(slot === "home" ? { homeTeamId: winnerId } : { awayTeamId: winnerId })
    .where(eq(matches.id, m.nextMatchId));

  return {};
}
