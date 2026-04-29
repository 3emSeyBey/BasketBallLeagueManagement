import { NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db/client";
import { seasonTeams, matches } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; teamId: string }> },
) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const { id, teamId } = await params;
  const seasonId = Number(id);
  const tId = Number(teamId);
  if (!Number.isFinite(seasonId) || !Number.isFinite(tId)) {
    return NextResponse.json({ error: "Bad id" }, { status: 400 });
  }

  const [hit] = await db
    .select({ id: matches.id })
    .from(matches)
    .where(and(
      eq(matches.seasonId, seasonId),
      or(eq(matches.homeTeamId, tId), eq(matches.awayTeamId, tId)),
    ))
    .limit(1);
  if (hit) {
    return NextResponse.json({ error: "Team has matches in this season; cannot remove" }, { status: 409 });
  }

  await db.delete(seasonTeams)
    .where(and(eq(seasonTeams.seasonId, seasonId), eq(seasonTeams.teamId, tId)));
  return NextResponse.json({ ok: true });
}
