import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, or } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { verifyPassword, signSession } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session";

const Body = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const raw = await req.json().catch(() => ({}));
  // Back-compat: accept legacy `email` field
  const input = raw.identifier ? raw : { ...raw, identifier: raw.email };
  const parsed = Body.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const id = parsed.data.identifier.trim();
  const user = await db.query.users.findFirst({
    where: or(eq(users.email, id), eq(users.username, id)),
  });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await signSession({ userId: user.id, role: user.role, teamId: user.teamId });
  const res = NextResponse.json({ id: user.id, email: user.email, role: user.role, teamId: user.teamId });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
