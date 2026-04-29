import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { matches } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

/**
 * Mark a match as the Season Final. Only one per season.
 */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const match = await db.query.matches.findFirst({ where: eq(matches.id, matchId) });
  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.update(matches)
    .set({ isSeasonFinal: false })
    .where(and(eq(matches.seasonId, match.seasonId), ne(matches.id, matchId)));

  await db.update(matches)
    .set({ isSeasonFinal: true, stage: "final" })
    .where(eq(matches.id, matchId));

  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  await db.update(matches).set({ isSeasonFinal: false }).where(eq(matches.id, matchId));
  return NextResponse.json({ ok: true });
}
