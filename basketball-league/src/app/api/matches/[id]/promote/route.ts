import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

const Body = z.object({
  teamId: z.number().int().positive(),
  toRound: z.number().int().min(2),
  scheduledAt: z.string().datetime(),
  venue: z.string().min(2).max(120).default("TBD"),
});

/**
 * Promote a winning team into a new match in the next round (or beyond).
 * Creates an empty match (this team in `home` slot) waiting for an opponent.
 * The admin can later fill the away slot via PATCH /api/matches/[id]/teams.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const source = await db.query.matches.findFirst({ where: eq(matches.id, matchId) });
  if (!source) return NextResponse.json({ error: "Source match not found" }, { status: 404 });
  if (source.status !== "final") {
    return NextResponse.json({ error: "Source match not yet final" }, { status: 409 });
  }
  const winnerOk = source.homeTeamId === parsed.data.teamId || source.awayTeamId === parsed.data.teamId;
  if (!winnerOk) return NextResponse.json({ error: "Team not in source match" }, { status: 400 });

  const winnerScore = source.homeTeamId === parsed.data.teamId ? source.homeScore : source.awayScore;
  const loserScore = source.homeTeamId === parsed.data.teamId ? source.awayScore : source.homeScore;
  if (winnerScore <= loserScore) {
    return NextResponse.json({ error: "Team did not win this match" }, { status: 400 });
  }

  const [created] = await db.insert(matches).values({
    seasonId: source.seasonId,
    divisionId: source.divisionId,
    homeTeamId: parsed.data.teamId,
    awayTeamId: null,
    scheduledAt: parsed.data.scheduledAt,
    venue: parsed.data.venue,
    stage: "playoff",
    round: parsed.data.toRound,
    agoraChannel: `match-${source.seasonId}-${Date.now()}`,
  }).returning();

  return NextResponse.json(created, { status: 201 });
}
