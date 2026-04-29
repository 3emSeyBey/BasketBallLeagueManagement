import { and, eq, or } from "drizzle-orm";
import { db } from "@/db/client";
import { matches } from "@/db/schema";

/**
 * Two teams cannot play each other twice in the same season.
 * Returns true if they have a recorded match (any status) in the season.
 */
export async function havePlayed(seasonId: number, a: number, b: number): Promise<boolean> {
  if (a === b) return true;
  const [hit] = await db
    .select({ id: matches.id })
    .from(matches)
    .where(and(
      eq(matches.seasonId, seasonId),
      or(
        and(eq(matches.homeTeamId, a), eq(matches.awayTeamId, b)),
        and(eq(matches.homeTeamId, b), eq(matches.awayTeamId, a)),
      ),
    ))
    .limit(1);
  return !!hit;
}
