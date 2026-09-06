import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches, users } from "@/db/schema";
import { getSession } from "@/lib/session";
import { effectiveMatchStatus } from "@/lib/match-status";
import { listMessages, postMessage, ChatError } from "@/lib/chat";

const GetQuery = z.object({ since: z.coerce.number().int().min(0).optional() });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const parsed = GetQuery.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });

  const rows = await listMessages(db, matchId, parsed.data.since ?? 0);
  return NextResponse.json(rows);
}

const PostBody = z.object({
  body: z.string().min(1).max(500),
  // Guests only — a logged-in sender's identity comes from the session, never
  // the request body, so no one can post as someone else.
  guestKey: z.string().min(1).max(100).optional(),
  displayName: z.string().min(1).max(40).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const parsed = PostBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const m = await db.query.matches.findFirst({ where: eq(matches.id, matchId) });
  if (!m) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const effective = effectiveMatchStatus(m.status, m.scheduledAt);
  if (effective !== "started" && effective !== "live") {
    return NextResponse.json({ error: "Chat is only open while the match is live" }, { status: 409 });
  }

  const session = await getSession();
  let senderId: number | null = null;
  let senderKey: string;
  let senderLabel: string;

  if (session) {
    const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    senderId = user.id;
    senderKey = `user:${user.id}`;
    senderLabel = user.name || user.email;
  } else {
    if (!parsed.data.guestKey || !parsed.data.displayName) {
      return NextResponse.json({ error: "Guest name required" }, { status: 400 });
    }
    senderKey = `guest:${parsed.data.guestKey}`;
    senderLabel = parsed.data.displayName;
  }

  try {
    const row = await postMessage(db, {
      matchId,
      senderId,
      senderKey,
      senderLabel,
      body: parsed.data.body,
    });
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    if (e instanceof ChatError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
