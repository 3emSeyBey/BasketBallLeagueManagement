import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

const Create = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(40).regex(/^[a-zA-Z0-9_.-]+$/, "Username may only contain letters, numbers, dot, underscore, dash"),
  name: z.string().min(1).max(120),
  contactNumber: z.string().min(7).max(40).optional(),
  password: z.string().min(6),
  role: z.enum(["admin", "team_manager"]),
});

export async function GET() {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }
  const rows = await db.select({
    id: users.id,
    email: users.email,
    username: users.username,
    name: users.name,
    contactNumber: users.contactNumber,
    role: users.role,
    teamId: users.teamId,
  }).from(users);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }
  const parsed = Create.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const passwordHash = await hashPassword(parsed.data.password);
  try {
    const [row] = await db.insert(users).values({
      email: parsed.data.email,
      username: parsed.data.username,
      name: parsed.data.name,
      contactNumber: parsed.data.contactNumber ?? null,
      passwordHash,
      role: parsed.data.role,
    }).returning({
      id: users.id, email: users.email, username: users.username,
      name: users.name, role: users.role, teamId: users.teamId,
    });
    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Email or username already exists" }, { status: 409 });
  }
}
