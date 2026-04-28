import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { matches } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

const Create = z.object({
  seasonId: z.number().int().positive(),
  homeTeamId: z.number().int().positive(),
  awayTeamId: z.number().int().positive(),
  scheduledAt: z.string().datetime(),
  venue: z.string().min(2).max(120),
}).refine((d) => d.homeTeamId !== d.awayTeamId, { message: "Home and away must differ" });

export async function GET() {
  const rows = await db.select().from(matches).orderBy(matches.scheduledAt);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }
  const parsed = Create.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const channel = `match-${Date.now()}-${parsed.data.homeTeamId}-${parsed.data.awayTeamId}`;
  const [row] = await db.insert(matches).values({ ...parsed.data, agoraChannel: channel }).returning();
  return NextResponse.json(row, { status: 201 });
}
