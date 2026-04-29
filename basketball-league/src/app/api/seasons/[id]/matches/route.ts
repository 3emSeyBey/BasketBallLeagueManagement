import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { seasons, matches, divisions, seasonTeams } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";
import { havePlayed } from "@/lib/match-history";
import { isDivisionLocked, isFinalsLocked } from "@/lib/division-lock";
import { computeDivisionStatus, computeFinalsStatus } from "@/lib/elimination";

const Body = z.object({
  divisionId: z.number().int().positive().nullable(), // null = Finals stage
  stage: z.enum(["pool", "playoff", "final"]),
  round: z.number().int().min(1).default(1),
  homeTeamId: z.number().int().positive().nullable(),
  awayTeamId: z.number().int().positive().nullable(),
  scheduledAt: z.string().datetime(),
  venue: z.string().min(2).max(120),
});

/**
 * Create a new match in a division pool/playoff column or in Finals.
 * Enforces:
 *  - no rematch
 *  - participants must be in the season + division (or be a division winner if Finals)
 *  - reviving a tentatively-eliminated team requires the division pool not to be locked
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const { id } = await params;
  const seasonId = Number(id);
  if (!Number.isFinite(seasonId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const season = await db.query.seasons.findFirst({ where: eq(seasons.id, seasonId) });
  if (!season) return NextResponse.json({ error: "Season not found" }, { status: 404 });

  const { divisionId, stage, round, homeTeamId, awayTeamId, scheduledAt, venue } = parsed.data;

  if (divisionId !== null) {
    const division = await db.query.divisions.findFirst({
      where: and(eq(divisions.id, divisionId), eq(divisions.seasonId, seasonId)),
    });
    if (!division) return NextResponse.json({ error: "Division not part of this season" }, { status: 400 });
  }

  // Participants must be enrolled in the season (and belong to the division for division stages).
  for (const tId of [homeTeamId, awayTeamId]) {
    if (tId === null) continue;
    const enrolled = await db.query.seasonTeams.findFirst({
      where: and(eq(seasonTeams.seasonId, seasonId), eq(seasonTeams.teamId, tId)),
    });
    if (!enrolled) {
      return NextResponse.json({ error: `Team ${tId} not enrolled in season` }, { status: 400 });
    }
    if (divisionId !== null && enrolled.divisionId !== divisionId) {
      return NextResponse.json({ error: `Team ${tId} is not in this division` }, { status: 400 });
    }
  }

  // No rematch.
  if (homeTeamId !== null && awayTeamId !== null) {
    const played = await havePlayed(seasonId, homeTeamId, awayTeamId);
    if (played) return NextResponse.json({ error: "These teams already played this season" }, { status: 409 });
  }

  // Pool revival: refuse if the division (or Finals) pool is locked AND any participant
  // is currently tentatively_eliminated.
  if (stage === "pool") {
    const locked = divisionId === null
      ? await isFinalsLocked(seasonId)
      : await isDivisionLocked(seasonId, divisionId);
    if (locked) {
      for (const tId of [homeTeamId, awayTeamId]) {
        if (tId === null) continue;
        const status = divisionId === null
          ? await computeFinalsStatus(seasonId, tId)
          : await computeDivisionStatus(seasonId, divisionId, tId);
        if (status === "tentative_eliminated" || status === "permanent_eliminated") {
          return NextResponse.json({ error: "Pool is locked; cannot revive eliminated team" }, { status: 409 });
        }
      }
    }
  }

  const [row] = await db.insert(matches).values({
    seasonId,
    divisionId,
    homeTeamId,
    awayTeamId,
    scheduledAt,
    venue,
    stage,
    round,
    agoraChannel: `match-${seasonId}-${Date.now()}`,
  }).returning();

  return NextResponse.json(row, { status: 201 });
}
