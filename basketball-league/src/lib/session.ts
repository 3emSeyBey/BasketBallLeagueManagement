import { cache } from "react";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { verifySession, type SessionPayload } from "./auth";

export const SESSION_COOKIE = "league_session";

// Memoized per-request — this is called from layouts, pages and API routes
// alike, and each call now costs a DB round trip to check for revocation.
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const c = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!c) return null;
  let session: SessionPayload;
  try {
    session = await verifySession(c);
  } catch {
    return null;
  }
  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  if (!user || user.sessionVersion !== session.sessionVersion) return null;
  return session;
});
