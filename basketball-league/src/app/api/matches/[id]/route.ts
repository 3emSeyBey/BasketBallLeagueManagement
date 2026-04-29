import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches, seasons } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";
import {
  announceMatchResult,
  announceChampion,
  announceScheduleChange,
  advanceBracketWinner,
} from "@/lib/announcement-events";

const Update = z.object({
  scheduledAt: z.string().datetime().optional(),
  venue: z.string().min(2).max(120).optional(),
  status: z.enum(["scheduled", "live", "final"]).optional(),
  homeScore: z.number().int().min(0).optional(),
  awayScore: z.number().int().min(0).optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await db.query.matches.findFirst({ where: eq(matches.id, Number(id)) });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const parsed = Update.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const before = await db.query.matches.findFirst({ where: eq(matches.id, idNum) });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [row] = await db.update(matches).set(parsed.data).where(eq(matches.id, idNum)).returning();

  // Schedule change → announcement
  const scheduleChanged = (parsed.data.scheduledAt && parsed.data.scheduledAt !== before.scheduledAt)
    || (parsed.data.venue && parsed.data.venue !== before.venue);
  if (scheduleChanged) {
    await announceScheduleChange(idNum, before.scheduledAt, before.venue);
  }

  // Match transitioned to final → advance + announcements
  if (before.status !== "final" && row.status === "final") {
    await announceMatchResult(idNum);
    const { championTeamId, seasonId } = await advanceBracketWinner(idNum);
    if (championTeamId && seasonId) {
      await announceChampion(seasonId, championTeamId);
      await db.update(seasons).set({ status: "ended", endedAt: new Date().toISOString() }).where(eq(seasons.id, seasonId));
    }
  }

  return NextResponse.json(row);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }
  const { id } = await params;
  await db.delete(matches).where(eq(matches.id, Number(id)));
  return NextResponse.json({ ok: true });
}
