import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, or } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { verifyPassword, signSession, SESSION_TTL_SECONDS } from "@/lib/auth";
import { getSession, SESSION_COOKIE } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const Body = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
  // Sent after the user picks "Continue logging in here" — logs the other session out.
  force: z.boolean().optional(),
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
    await logAudit(db, {
      actorId: user?.id ?? null,
      actorLabel: user?.name || user?.email || id,
      action: "auth.login",
      outcome: "failure",
    });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // An unexpired token exists for this account and it isn't this browser's —
  // ask before logging that session out.
  const current = await getSession();
  const inUseElsewhere = (user.sessionExpiresAt ?? 0) > Date.now() && current?.userId !== user.id;
  if (inUseElsewhere && !parsed.data.force) {
    return NextResponse.json({ error: "Account in use elsewhere", code: "SESSION_ACTIVE" }, { status: 409 });
  }
  // Taking over bumps the version, which invalidates the other session's token.
  const sessionVersion = inUseElsewhere ? user.sessionVersion + 1 : user.sessionVersion;
  await db.update(users)
    .set({ sessionVersion, sessionExpiresAt: Date.now() + SESSION_TTL_SECONDS * 1000 })
    .where(eq(users.id, user.id));

  await logAudit(db, {
    actorId: user.id,
    actorLabel: user.name || user.email,
    action: "auth.login",
    outcome: "success",
  });

  const token = await signSession({
    userId: user.id, role: user.role, teamId: user.teamId, status: user.status,
    sessionVersion,
  });
  const res = NextResponse.json({ id: user.id, email: user.email, role: user.role, teamId: user.teamId });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
