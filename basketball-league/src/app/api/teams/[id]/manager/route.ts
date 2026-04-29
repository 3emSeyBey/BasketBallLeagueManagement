import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { teams, users } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

const Body = z.object({ managerId: z.number().int().positive() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const { id } = await params;
  const teamId = Number(id);
  if (!Number.isFinite(teamId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newManager = await db.query.users.findFirst({ where: eq(users.id, parsed.data.managerId) });
  if (!newManager || newManager.role !== "team_manager" || newManager.teamId !== null) {
    return NextResponse.json({ error: "Manager must be an unassigned team manager" }, { status: 400 });
  }

  await db.update(users)
    .set({ teamId: null })
    .where(and(eq(users.teamId, teamId), eq(users.role, "team_manager")));

  await db.update(users).set({ teamId }).where(eq(users.id, parsed.data.managerId));

  return NextResponse.json({ ok: true });
}
