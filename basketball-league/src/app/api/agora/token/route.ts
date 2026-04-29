import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches } from "@/db/schema";
import { getSession } from "@/lib/session";
import { canManageTeam } from "@/lib/rbac";
import { buildRtcToken } from "@/lib/agora";

const Q = z.object({ matchId: z.coerce.number().int().positive() });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = Q.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const m = await db.query.matches.findFirst({
    where: eq(matches.id, parsed.data.matchId),
  });
  if (!m || !m.agoraChannel)
    return NextResponse.json({ error: "No channel" }, { status: 404 });

  const session = await getSession();
  const canPublish =
    session?.role === "admin" ||
    (m.homeTeamId !== null && canManageTeam(session, m.homeTeamId)) ||
    (m.awayTeamId !== null && canManageTeam(session, m.awayTeamId));
  const role = canPublish ? "publisher" : "subscriber";
  const uid = session?.userId ?? Math.floor(Math.random() * 1_000_000);

  try {
    const token = buildRtcToken(m.agoraChannel, uid, role);
    return NextResponse.json({
      appId: process.env.NEXT_PUBLIC_AGORA_APP_ID,
      channel: m.agoraChannel,
      token,
      uid,
      role,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Token failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
