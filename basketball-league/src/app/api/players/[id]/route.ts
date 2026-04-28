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
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const player = await db.query.players.findFirst({ where: eq(players.id, Number(id)) });
  if (!player) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManageTeam(session, player.teamId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = Update.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const [row] = await db.update(players).set(parsed.data).where(eq(players.id, Number(id))).returning();
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
