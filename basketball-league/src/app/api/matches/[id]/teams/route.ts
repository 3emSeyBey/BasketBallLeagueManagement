import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches, seasonTeams } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";
import { havePlayed } from "@/lib/match-history";

const Body = z.object({
  homeTeamId: z.number().int().positive().nullable().optional(),
  awayTeamId: z.number().int().positive().nullable().optional(),
});

/**
 * Fill / change the participants of a not-yet-final match.
 * Enforces no-rematch + season membership.
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
  if (match.status === "final") {
    return NextResponse.json({ error: "Match already finalized" }, { status: 409 });
  }

  const newHome = parsed.data.homeTeamId === undefined ? match.homeTeamId : parsed.data.homeTeamId;
  const newAway = parsed.data.awayTeamId === undefined ? match.awayTeamId : parsed.data.awayTeamId;

  for (const tId of [newHome, newAway]) {
    if (tId === null) continue;
    const enrolled = await db.query.seasonTeams.findFirst({
      where: and(eq(seasonTeams.seasonId, match.seasonId), eq(seasonTeams.teamId, tId)),
    });
    if (!enrolled) return NextResponse.json({ error: `Team ${tId} not in season` }, { status: 400 });
    if (match.divisionId !== null && enrolled.divisionId !== match.divisionId) {
      return NextResponse.json({ error: `Team ${tId} not in division` }, { status: 400 });
    }
  }

  if (newHome !== null && newAway !== null && newHome === newAway) {
    return NextResponse.json({ error: "Cannot match a team against itself" }, { status: 400 });
  }
  if (newHome !== null && newAway !== null) {
    // Check rematch — exclude the current match from history.
    const matchesInSeason = await db
      .select({ id: matches.id, h: matches.homeTeamId, a: matches.awayTeamId })
      .from(matches)
      .where(eq(matches.seasonId, match.seasonId));
    const hit = matchesInSeason.some(m =>
      m.id !== matchId &&
      ((m.h === newHome && m.a === newAway) || (m.h === newAway && m.a === newHome)),
    );
    if (hit) return NextResponse.json({ error: "These teams already played this season" }, { status: 409 });
  }

  await db.update(matches)
    .set({ homeTeamId: newHome, awayTeamId: newAway })
    .where(eq(matches.id, matchId));

  return NextResponse.json({ ok: true });
}

// Unused but kept for ESLint to not strip the import.
void havePlayed;
