import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { getSession } from "@/lib/session";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json(null);
  const u = await db.query.users.findFirst({ where: eq(users.id, s.userId) });
  if (!u) return NextResponse.json(null);
  return NextResponse.json({
    id: u.id,
    email: u.email,
    username: u.username,
    name: u.name,
    role: u.role,
    teamId: u.teamId,
    contactNumber: u.contactNumber,
  });
}

const Update = z.object({
  email: z.string().email().optional(),
  username: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9_.-]+$/)
    .optional(),
  name: z.string().min(1).max(120).optional(),
  contactNumber: z.string().max(40).nullable().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

export async function PATCH(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Update.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const me = await db.query.users.findFirst({ where: eq(users.id, s.userId) });
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const patch: Record<string, unknown> = {};
  if (parsed.data.email !== undefined) patch.email = parsed.data.email;
  if (parsed.data.username !== undefined) patch.username = parsed.data.username;
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.contactNumber !== undefined)
    patch.contactNumber = parsed.data.contactNumber || null;

  if (parsed.data.newPassword !== undefined) {
    if (!parsed.data.currentPassword)
      return NextResponse.json(
        { error: "Current password required" },
        { status: 400 },
      );
    const ok = await verifyPassword(parsed.data.currentPassword, me.passwordHash);
    if (!ok)
      return NextResponse.json(
        { error: "Current password incorrect" },
        { status: 400 },
      );
    patch.passwordHash = await hashPassword(parsed.data.newPassword);
  }

  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "No changes" }, { status: 400 });

  try {
    const [row] = await db
      .update(users)
      .set(patch)
      .where(eq(users.id, s.userId))
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        name: users.name,
        role: users.role,
      });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json(
      { error: "Email or username already in use" },
      { status: 409 },
    );
  }
}
