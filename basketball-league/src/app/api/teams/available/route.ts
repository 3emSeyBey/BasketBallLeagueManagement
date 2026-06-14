import { NextResponse } from "next/server";
import { asc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { teams, divisions, users } from "@/db/schema";

// Teams that have no manager yet and aren't already requested by a pending
// registration — offered when a manager registers to claim an existing team.
export async function GET() {
  const [teamRows, takenRows, requestedRows] = await Promise.all([
    db.select({ id: teams.id, name: teams.name, division: divisions.name })
      .from(teams).leftJoin(divisions, eq(divisions.id, teams.divisionId)).orderBy(asc(teams.name)),
    db.select({ teamId: users.teamId }).from(users).where(isNotNull(users.teamId)),
    db.select({ teamId: users.requestedTeamId }).from(users).where(eq(users.status, "pending")),
  ]);

  const taken = new Set<number>();
  for (const r of takenRows) if (r.teamId != null) taken.add(r.teamId);
  for (const r of requestedRows) if (r.teamId != null) taken.add(r.teamId);

  return NextResponse.json(teamRows.filter((t) => !taken.has(t.id)));
}
