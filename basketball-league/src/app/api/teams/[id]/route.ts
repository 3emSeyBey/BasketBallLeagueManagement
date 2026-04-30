import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { teams, teamDivisions } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

const Update = z.object({
  name: z.string().min(2).max(80).optional(),
  division: z.string().trim().min(1).max(60).optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await db.query.teams.findFirst({ where: eq(teams.id, Number(id)) });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }
  const { id } = await params;
  const parsed = Update.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (parsed.data.division) {
    const div = await db.query.teamDivisions.findFirst({
      where: eq(teamDivisions.name, parsed.data.division),
    });
    if (!div) return NextResponse.json({ error: "Unknown division" }, { status: 400 });
  }
  const [row] = await db.update(teams).set(parsed.data).where(eq(teams.id, Number(id))).returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }
  const { id } = await params;
  await db.delete(teams).where(eq(teams.id, Number(id)));
  return NextResponse.json({ ok: true });
}
