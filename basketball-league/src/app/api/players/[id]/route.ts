import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { players } from "@/db/schema";
import { getSession } from "@/lib/session";
import { canManageTeam } from "@/lib/rbac";

const Update = z.object({
  name: z.string().min(2).max(80).optional(),
  jerseyNumber: z.number().int().min(0).max(99).optional(),
  position: z.enum(["PG", "SG", "SF", "PF", "C"]).optional(),
  height: z.string().max(20).nullable().optional(),
  contactNumber: z.string().max(40).nullable().optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const row = await db.select({
    id: players.id,
    teamId: players.teamId,
    name: players.name,
    jerseyNumber: players.jerseyNumber,
    position: players.position,
    height: players.height,
    contactNumber: players.contactNumber,
    imageMimeType: players.imageMimeType,
    createdAt: players.createdAt,
  }).from(players).where(eq(players.id, idNum)).then(r => r[0]);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { imageMimeType, ...rest } = row;
  return NextResponse.json({ ...rest, hasImage: imageMimeType !== null });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const player = await db.query.players.findFirst({ where: eq(players.id, Number(id)) });
  if (!player) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManageTeam(session, player.teamId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = Update.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.jerseyNumber !== undefined) patch.jerseyNumber = parsed.data.jerseyNumber;
  if (parsed.data.position !== undefined) patch.position = parsed.data.position;
  if (parsed.data.height !== undefined) patch.height = parsed.data.height || null;
  if (parsed.data.contactNumber !== undefined) patch.contactNumber = parsed.data.contactNumber || null;
  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true });
  const [row] = await db.update(players).set(patch).where(eq(players.id, Number(id))).returning();
  return NextResponse.json(row);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const player = await db.query.players.findFirst({ where: eq(players.id, Number(id)) });
  if (!player) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManageTeam(session, player.teamId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await db.delete(players).where(eq(players.id, Number(id)));
  return NextResponse.json({ ok: true });
}
