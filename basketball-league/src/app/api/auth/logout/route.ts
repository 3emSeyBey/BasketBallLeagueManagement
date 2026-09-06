import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { getSession, SESSION_COOKIE } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function POST() {
  const session = await getSession();
  if (session) {
    const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
    await logAudit(db, {
      actorId: session.userId,
      actorLabel: user?.name || user?.email || String(session.userId),
      action: "auth.logout",
    });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
