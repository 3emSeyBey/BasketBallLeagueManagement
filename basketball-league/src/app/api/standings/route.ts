import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { teams, matches } from "@/db/schema";
import { computeStandings } from "@/lib/standings";

export async function GET() {
  const [allTeams, allMatches] = await Promise.all([
    db.select().from(teams),
    db.select().from(matches),
  ]);
  return NextResponse.json(computeStandings(allTeams, allMatches));
}
