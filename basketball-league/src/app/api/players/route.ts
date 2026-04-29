import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { players } from "@/db/schema";
import { getSession } from "@/lib/session";
import { canManageTeam } from "@/lib/rbac";

const Create = z.object({
  teamId: z.number().int().positive(),
  name: z.string().min(2).max(80),
  jerseyNumber: z.number().int().min(0).max(99),
  position: z.enum(["PG", "SG", "SF", "PF", "C"]),
  height: z.string().max(20).optional(),
  contactNumber: z.string().max(40).optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const teamId = url.searchParams.get("teamId");
  const rows = teamId
    ? await db.select().from(players).where(eq(players.teamId, Number(teamId))).orderBy(players.jerseyNumber)
    : await db.select().from(players).orderBy(players.name);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await getSession();
  const body = await req.json();
  const parsed = Create.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (!canManageTeam(session, parsed.data.teamId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [row] = await db.insert(players).values({
    teamId: parsed.data.teamId,
    name: parsed.data.name,
    jerseyNumber: parsed.data.jerseyNumber,
    position: parsed.data.position,
    height: parsed.data.height || null,
    contactNumber: parsed.data.contactNumber || null,
  }).returning({ id: players.id });
  return NextResponse.json(row, { status: 201 });
}
