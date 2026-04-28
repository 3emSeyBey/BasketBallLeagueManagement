import { cookies } from "next/headers";
import { verifySession, type SessionPayload } from "./auth";

export const SESSION_COOKIE = "league_session";

export async function getSession(): Promise<SessionPayload | null> {
  const c = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!c) return null;
  try { return await verifySession(c); } catch { return null; }
}
