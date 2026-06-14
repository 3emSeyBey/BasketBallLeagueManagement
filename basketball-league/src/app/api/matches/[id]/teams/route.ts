import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches, teams } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

const Body = z.object({
  homeTeamId: z.number().int().positive().nullable().optional(),
  awayTeamId: z.number().int().positive().nullable().optional(),
});

/**
 * Fill / change the participants of a not-yet-final match.
 * If the match belongs to a division, teams must belong to that division.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const match = await db.query.matches.findFirst({ where: eq(matches.id, matchId) });
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (match.status === "ended") {
    return NextResponse.json({ error: "Match already finalized" }, { status: 409 });
  }

  const newHome = parsed.data.homeTeamId === undefined ? match.homeTeamId : parsed.data.homeTeamId;
  const newAway = parsed.data.awayTeamId === undefined ? match.awayTeamId : parsed.data.awayTeamId;

  for (const tId of [newHome, newAway]) {
    if (tId === null) continue;
    const team = await db.query.teams.findFirst({ where: eq(teams.id, tId) });
    if (!team) return NextResponse.json({ error: `Team ${tId} not found` }, { status: 400 });
    if (match.divisionId !== null && team.divisionId !== match.divisionId) {
      return NextResponse.json({ error: `Team ${tId} not in this division` }, { status: 400 });
    }
  }

  if (newHome !== null && newAway !== null && newHome === newAway) {
    return NextResponse.json({ error: "Cannot match a team against itself" }, { status: 400 });
  }

  await db.update(matches)
    .set({ homeTeamId: newHome, awayTeamId: newAway })
    .where(eq(matches.id, matchId));

  return NextResponse.json({ ok: true });
}
