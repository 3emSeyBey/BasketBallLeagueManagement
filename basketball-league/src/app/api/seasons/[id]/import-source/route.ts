import { NextResponse } from "next/server";
import { asc, eq, inArray, count } from "drizzle-orm";
import { db } from "@/db/client";
import { divisions, teams, players, users } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

// Divisions -> teams (+ player counts, manager name) for the import wizard tree.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const { id } = await params;
  const seasonId = Number(id);
  if (!Number.isFinite(seasonId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const divs = await db.select().from(divisions).where(eq(divisions.seasonId, seasonId)).orderBy(asc(divisions.name));
  const divIds = divs.map((d) => d.id);
  const teamRows = divIds.length
    ? await db.select({ id: teams.id, name: teams.name, divisionId: teams.divisionId })
        .from(teams).where(inArray(teams.divisionId, divIds)).orderBy(asc(teams.name))
    : [];
  const teamIds = teamRows.map((t) => t.id);

  const playerCounts = teamIds.length
    ? await db.select({ teamId: players.teamId, c: count() }).from(players).where(inArray(players.teamId, teamIds)).groupBy(players.teamId)
    : [];
  const countByTeam = new Map(playerCounts.map((r) => [r.teamId, r.c]));

  const managers = teamIds.length
    ? await db.select({ teamId: users.teamId, name: users.name, email: users.email }).from(users).where(inArray(users.teamId, teamIds))
    : [];
  const mgrByTeam = new Map(managers.map((m) => [m.teamId, m.name || m.email]));

  const result = divs.map((d) => ({
    divisionId: d.id,
    divisionName: d.name,
    teams: teamRows.filter((t) => t.divisionId === d.id).map((t) => ({
      teamId: t.id,
      name: t.name,
      playerCount: countByTeam.get(t.id) ?? 0,
      managerName: t.id != null ? mgrByTeam.get(t.id) ?? null : null,
    })),
  }));

  return NextResponse.json(result);
}
