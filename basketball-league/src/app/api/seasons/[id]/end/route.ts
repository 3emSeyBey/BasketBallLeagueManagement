import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { seasons } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";
import { endSeason } from "@/lib/season-service";

// End an active season (moves it to the read-only archive).
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const { id } = await params;
  const seasonId = Number(id);
  if (!Number.isFinite(seasonId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const season = await db.query.seasons.findFirst({ where: eq(seasons.id, seasonId) });
  if (!season) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (season.status === "ended") return NextResponse.json({ error: "Already ended" }, { status: 409 });

  await endSeason(db, seasonId);
  return NextResponse.json({ ok: true });
}
