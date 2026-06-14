import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { teams, matches, divisions } from "@/db/schema";
import { computeStandings } from "@/lib/standings";

export async function GET() {
  const [allTeams, allMatches, allDivisions] = await Promise.all([
    db.select().from(teams),
    db.select().from(matches),
    db.select().from(divisions),
  ]);
  const divisionName = new Map(allDivisions.map((d) => [d.id, d.name]));
  const teamsWithDivision = allTeams.map((t) => ({
    id: t.id,
    name: t.name,
    division: divisionName.get(t.divisionId) ?? "",
  }));
  return NextResponse.json(computeStandings(teamsWithDivision, allMatches));
}
