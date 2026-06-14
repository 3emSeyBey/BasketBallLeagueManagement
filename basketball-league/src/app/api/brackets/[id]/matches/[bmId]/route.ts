import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { bracketMatches } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";
import { setSlot, removeBracketMatch } from "@/lib/bracket-service";

const Patch = z.object({
  slot: z.enum(["home", "away"]),
  teamId: z.number().int().positive().nullable(),
});

// Set or clear a team in one slot of a bracket box.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; bmId: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const { bmId } = await params;
  const bracketMatchId = Number(bmId);
  if (!Number.isFinite(bracketMatchId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const parsed = Patch.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const bm = await db.query.bracketMatches.findFirst({ where: eq(bracketMatches.id, bracketMatchId) });
  if (!bm) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await setSlot(db, bracketMatchId, parsed.data.slot, parsed.data.teamId);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Cannot set slot" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

// Remove a round-1 box (and re-pack / rebuild the bracket).
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; bmId: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const { bmId } = await params;
  const bracketMatchId = Number(bmId);
  if (!Number.isFinite(bracketMatchId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const bm = await db.query.bracketMatches.findFirst({ where: eq(bracketMatches.id, bracketMatchId) });
  if (!bm) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (bm.roundIndex !== 0) {
    return NextResponse.json({ error: "Only round-1 boxes can be removed directly" }, { status: 400 });
  }

  await removeBracketMatch(db, bracketMatchId);
  return NextResponse.json({ ok: true });
}
