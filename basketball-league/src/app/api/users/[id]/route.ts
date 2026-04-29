import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

const Update = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).max(40).regex(/^[a-zA-Z0-9_.-]+$/).optional(),
  name: z.string().min(1).max(120).optional(),
  contactNumber: z.string().max(40).nullable().optional(),
  password: z.string().min(6).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const parsed = Update.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (parsed.data.email !== undefined) patch.email = parsed.data.email;
  if (parsed.data.username !== undefined) patch.username = parsed.data.username;
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.contactNumber !== undefined) patch.contactNumber = parsed.data.contactNumber || null;
  if (parsed.data.password !== undefined) patch.passwordHash = await hashPassword(parsed.data.password);

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "No changes" }, { status: 400 });

  try {
    const [row] = await db.update(users).set(patch).where(eq(users.id, idNum)).returning({
      id: users.id, email: users.email, username: users.username,
      name: users.name, role: users.role, teamId: users.teamId,
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Email or username already in use" }, { status: 409 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  try { requireRole(session, "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  if (session!.userId === idNum) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

  const target = await db.query.users.findFirst({ where: eq(users.id, idNum) });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.role === "admin") return NextResponse.json({ error: "Admins cannot be deleted" }, { status: 400 });
  if (target.teamId !== null) return NextResponse.json({ error: "Manager is assigned to a team. Switch the team's manager first." }, { status: 400 });

  await db.delete(users).where(eq(users.id, idNum));
  return NextResponse.json({ ok: true });
}
