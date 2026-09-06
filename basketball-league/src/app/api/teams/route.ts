import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { teams, users, divisions } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";
import { autoPlaceTeam } from "@/lib/bracket-service";
import { assertDivisionEditable, SeasonLockedError } from "@/lib/season-guard";
import { logAudit } from "@/lib/audit";

const Create = z.object({
  name: z.string().min(2).max(80),
  divisionId: z.number().int().positive(),
  managerId: z.number().int().positive(),
});

export async function GET() {
  const rows = await db.select().from(teams).orderBy(teams.name);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  let session;
  try { session = requireRole(await getSession(), "admin"); }
  catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw e;
  }
  const parsed = Create.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { managerId, name, divisionId } = parsed.data;

  const div = await db.query.divisions.findFirst({ where: eq(divisions.id, divisionId) });
  if (!div) return NextResponse.json({ error: "Unknown division" }, { status: 400 });

  try { await assertDivisionEditable(divisionId); }
  catch (e) { if (e instanceof SeasonLockedError) return NextResponse.json({ error: e.message }, { status: 409 }); throw e; }

  const manager = await db.query.users.findFirst({ where: eq(users.id, managerId) });
  if (!manager || manager.role !== "team_manager" || manager.teamId !== null) {
    return NextResponse.json({ error: "Manager must be an unassigned team manager" }, { status: 400 });
  }

  const [row] = await db.insert(teams).values({ name, divisionId }).returning();
  await db.update(users).set({ teamId: row.id }).where(eq(users.id, managerId));

  // New team joins the division's default bracket (round 1) automatically.
  await autoPlaceTeam(db, divisionId, row.id);

  await logAudit(db, {
    actorId: session.userId, action: "team.create",
    targetType: "team", targetId: row.id, meta: { name, divisionId, managerId },
  });

  return NextResponse.json(row, { status: 201 });
}
