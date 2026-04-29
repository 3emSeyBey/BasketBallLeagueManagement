import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { teams, users } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

const Create = z.object({
  name: z.string().min(2).max(80),
  division: z.enum(["A", "B"]),
  managerId: z.number().int().positive(),
});

export async function GET() {
  const rows = await db.select().from(teams).orderBy(teams.name);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw e;
  }
  const parsed = Create.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { managerId, ...teamFields } = parsed.data;

  const manager = await db.query.users.findFirst({ where: eq(users.id, managerId) });
  if (!manager || manager.role !== "team_manager" || manager.teamId !== null) {
    return NextResponse.json({ error: "Manager must be an unassigned team manager" }, { status: 400 });
  }

  const [row] = await db.insert(teams).values(teamFields).returning();
  await db.update(users).set({ teamId: row.id }).where(eq(users.id, managerId));

  return NextResponse.json(row, { status: 201 });
}
