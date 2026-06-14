import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches, bracketMatches } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";
import {
  announceMatchResult,
  announceChampion,
  announceScheduleChange,
} from "@/lib/announcement-events";
import { advanceWinner } from "@/lib/bracket-service";
import { assertSeasonEditable, SeasonLockedError } from "@/lib/season-guard";

const Update = z.object({
  scheduledAt: z.string().datetime().nullable().optional(),
  venue: z.string().min(2).max(120).optional(),
  status: z.enum(["planned", "scheduled", "started", "live", "ended"]).optional(),
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
  let session;
  try { session = requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const parsed = Update.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const before = await db.query.matches.findFirst({ where: eq(matches.id, idNum) });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try { await assertSeasonEditable(before.seasonId); }
  catch (e) { if (e instanceof SeasonLockedError) return NextResponse.json({ error: e.message }, { status: 409 }); throw e; }

  // A bracket match can't end in a tie — there'd be no winner to advance.
  const becomingEnded = before.status !== "ended" && parsed.data.status === "ended";
  if (becomingEnded) {
    const h = parsed.data.homeScore ?? before.homeScore;
    const a = parsed.data.awayScore ?? before.awayScore;
    if (h === a) {
      const inBracket = await db.query.bracketMatches.findFirst({ where: eq(bracketMatches.matchId, idNum) });
      if (inBracket) {
        return NextResponse.json(
          { error: "This match can't end in a tie — enter the final (overtime) score before ending." },
          { status: 409 },
        );
      }
    }
  }

  // Track who is broadcasting: set on going live, clear when paused/ended.
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "live") updateData.broadcasterUserId = session.userId;
  else if (parsed.data.status === "started" || parsed.data.status === "ended") updateData.broadcasterUserId = null;

  const [row] = await db.update(matches).set(updateData).where(eq(matches.id, idNum)).returning();

  // Schedule change → announcement
  const scheduleChanged = (parsed.data.scheduledAt && parsed.data.scheduledAt !== before.scheduledAt)
    || (parsed.data.venue && parsed.data.venue !== before.venue);
  if (scheduleChanged) {
    await announceScheduleChange(idNum, before.scheduledAt, before.venue);
  }

  // Match ended → announce result, advance bracket winner, announce champion
  // if it was a bracket final (no next round to feed).
  if (before.status !== "ended" && row.status === "ended") {
    await announceMatchResult(idNum);
    const { championTeamId } = await advanceWinner(db, idNum);
    if (championTeamId) {
      await announceChampion(row.seasonId, championTeamId);
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
