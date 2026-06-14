import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { divisions, seasons } from "@/db/schema";

// List every division across all seasons, labelled with its season, for use in
// pickers (e.g. team creation). Newest seasons first, divisions alphabetical.
export async function GET() {
  const rows = await db
    .select({
      id: divisions.id,
      name: divisions.name,
      seasonId: divisions.seasonId,
      seasonName: seasons.name,
      seasonStatus: seasons.status,
    })
    .from(divisions)
    .innerJoin(seasons, eq(seasons.id, divisions.seasonId))
    .orderBy(asc(seasons.id), asc(divisions.name));
  return NextResponse.json(rows);
}
