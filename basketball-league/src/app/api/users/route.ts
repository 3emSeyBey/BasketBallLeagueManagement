import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

const Create = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "team_manager"]),
  teamId: z.number().int().positive().optional(),
});

export async function GET() {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }
  const rows = await db.select({ id: users.id, email: users.email, role: users.role, teamId: users.teamId }).from(users);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }
  const parsed = Create.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const passwordHash = await hashPassword(parsed.data.password);
  const [row] = await db.insert(users).values({
    email: parsed.data.email, passwordHash, role: parsed.data.role, teamId: parsed.data.teamId ?? null,
  }).returning({ id: users.id, email: users.email, role: users.role, teamId: users.teamId });
  return NextResponse.json(row, { status: 201 });
}
