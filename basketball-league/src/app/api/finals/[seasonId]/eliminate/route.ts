import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { finalsEliminations } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

const Body = z.object({
  teamId: z.number().int().positive(),
});

/**
 * Manual override: admin permanently eliminates a losing team in Finals.
 * Idempotent.
 */
export async function POST(req: Request, { params }: { params: Promise<{ seasonId: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const { seasonId: rawId } = await params;
  const seasonId = Number(rawId);
  if (!Number.isFinite(seasonId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await db.insert(finalsEliminations).values({
    seasonId,
    teamId: parsed.data.teamId,
  }).onConflictDoNothing();

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ seasonId: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const { seasonId: rawId } = await params;
  const seasonId = Number(rawId);
  if (!Number.isFinite(seasonId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await db.delete(finalsEliminations)
    .where(and(eq(finalsEliminations.seasonId, seasonId), eq(finalsEliminations.teamId, parsed.data.teamId)));
  return NextResponse.json({ ok: true });
}
