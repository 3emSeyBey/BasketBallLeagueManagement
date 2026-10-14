import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { verifyPassword, signSession, SESSION_TTL_SECONDS } from "@/lib/auth";
import { getSession, SESSION_COOKIE } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const lockedResponse = (lockedUntil: number) => {
  const minutes = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 60000));
  return NextResponse.json(
    { error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`, code: "LOCKED" },
    { status: 429, headers: { "Retry-After": String(Math.ceil((lockedUntil - Date.now()) / 1000)) } },
  );
};

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
  // While locked, refuse without checking the password so guesses can't continue.
  if (user?.lockedUntil && user.lockedUntil > Date.now()) {
    await logAudit(db, {
      actorId: user.id,
      actorLabel: user.name || user.email,
      action: "auth.login",
      outcome: "failure",
      meta: { reason: "locked" },
    });
    return lockedResponse(user.lockedUntil);
  }

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    let lockedUntil: number | null = null;
    if (user) {
      // Atomic increment so concurrent guesses can't slip past the limit.
      const [row] = await db.update(users)
        .set({ failedLoginAttempts: sql`${users.failedLoginAttempts} + 1` })
        .where(eq(users.id, user.id))
        .returning({ attempts: users.failedLoginAttempts });
      if (row.attempts >= MAX_FAILED_LOGINS) {
        lockedUntil = Date.now() + LOCKOUT_MS;
        await db.update(users)
          .set({ failedLoginAttempts: 0, lockedUntil })
          .where(eq(users.id, user.id));
      }
    }
    await logAudit(db, {
      actorId: user?.id ?? null,
      actorLabel: user?.name || user?.email || id,
      action: "auth.login",
      outcome: "failure",
      meta: lockedUntil ? { reason: "locked_out", lockedUntil: new Date(lockedUntil).toISOString() } : undefined,
    });
    if (lockedUntil) return lockedResponse(lockedUntil);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await db.update(users).set({ failedLoginAttempts: 0, lockedUntil: null }).where(eq(users.id, user.id));
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
