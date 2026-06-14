import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, teams } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";
import { autoPlaceTeam } from "@/lib/bracket-service";

// Approve a pending team-manager registration: materialize their team (create
// a new one or claim the requested existing one), then activate the account.
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.status !== "pending") return NextResponse.json({ error: "User is not pending" }, { status: 400 });

  let teamId: number;

  if (user.requestedTeamId != null) {
    const team = await db.query.teams.findFirst({ where: eq(teams.id, user.requestedTeamId) });
    if (!team) return NextResponse.json({ error: "Requested team no longer exists" }, { status: 409 });
    const taken = await db.query.users.findFirst({ where: eq(users.teamId, team.id) });
    if (taken) return NextResponse.json({ error: "That team already has a manager" }, { status: 409 });
    teamId = team.id;
  } else if (user.requestedTeamName && user.requestedDivisionId != null) {
    const dup = await db.query.teams.findFirst({ where: eq(teams.name, user.requestedTeamName) });
    if (dup) return NextResponse.json({ error: "A team with that name already exists" }, { status: 409 });
    const [team] = await db.insert(teams)
      .values({ name: user.requestedTeamName, divisionId: user.requestedDivisionId })
      .returning();
    await autoPlaceTeam(db, user.requestedDivisionId, team.id);
    teamId = team.id;
  } else {
    return NextResponse.json({ error: "No team request on this account" }, { status: 400 });
  }

  await db.update(users).set({
    status: "active",
    teamId,
    requestedTeamName: null,
    requestedDivisionId: null,
    requestedTeamId: null,
  }).where(eq(users.id, userId));

  return NextResponse.json({ ok: true, teamId });
}
