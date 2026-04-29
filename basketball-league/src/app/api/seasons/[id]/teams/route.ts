import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { seasons, seasonTeams, divisions, teams } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

const Body = z.object({
  teamId: z.number().int().positive(),
  divisionId: z.number().int().positive(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seasonId = Number(id);
  if (!Number.isFinite(seasonId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const rows = await db
    .select({
      id: seasonTeams.id,
      teamId: seasonTeams.teamId,
      teamName: teams.name,
      divisionId: seasonTeams.divisionId,
      divisionName: divisions.name,
    })
    .from(seasonTeams)
    .leftJoin(teams, eq(teams.id, seasonTeams.teamId))
    .leftJoin(divisions, eq(divisions.id, seasonTeams.divisionId))
    .where(eq(seasonTeams.seasonId, seasonId));

  return NextResponse.json(rows);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const { id } = await params;
  const seasonId = Number(id);
  if (!Number.isFinite(seasonId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const season = await db.query.seasons.findFirst({ where: eq(seasons.id, seasonId) });
  if (!season) return NextResponse.json({ error: "Season not found" }, { status: 404 });

  const division = await db.query.divisions.findFirst({
    where: and(eq(divisions.id, parsed.data.divisionId), eq(divisions.seasonId, seasonId)),
  });
  if (!division) return NextResponse.json({ error: "Division does not belong to this season" }, { status: 400 });

  const team = await db.query.teams.findFirst({ where: eq(teams.id, parsed.data.teamId) });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  try {
    const [row] = await db.insert(seasonTeams).values({
      seasonId,
      teamId: parsed.data.teamId,
      divisionId: parsed.data.divisionId,
    }).returning();
    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Team already in season" }, { status: 409 });
  }
}
