import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { announcements, users, matches, teams, seasons } from "@/db/schema";

async function systemAuthorId(): Promise<number | null> {
  const admin = await db.query.users.findFirst({ where: eq(users.role, "admin") });
  return admin?.id ?? null;
}

export async function announceMatchResult(matchId: number) {
  const m = await db.query.matches.findFirst({ where: eq(matches.id, matchId) });
  if (!m || m.status !== "ended" || m.homeTeamId == null || m.awayTeamId == null) return;
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

  const seasonLabel = season ? ` — ${season.name}` : "";
  const title = `${winner.name} defeat ${loser.name}`;
  const body = `<p><strong>${winner.name}</strong> beat <strong>${loser.name}</strong> ${winScore}–${loseScore}${seasonLabel}.</p>`;

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
  const newDate = m.scheduledAt ? new Date(m.scheduledAt).toLocaleString() : "TBD";
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

