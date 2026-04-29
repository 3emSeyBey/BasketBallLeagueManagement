import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches } from "@/db/schema";

/**
 * A division's pool eliminations lock when the earliest scheduled
 * playoff match (round 2+) reaches its scheduled time.
 *
 * The lock state is derived (not stored) — re-checked on every read.
 */
export async function isDivisionLocked(seasonId: number, divisionId: number): Promise<boolean> {
  const [first] = await db
    .select({ scheduledAt: matches.scheduledAt })
    .from(matches)
    .where(and(
      eq(matches.seasonId, seasonId),
      eq(matches.divisionId, divisionId),
      eq(matches.stage, "playoff"),
    ))
    .orderBy(asc(matches.scheduledAt))
    .limit(1);
  if (!first) return false;
  return new Date(first.scheduledAt).getTime() <= Date.now();
}

/**
 * Finals follows the same rule as a division: pool locks when the first
 * playoff/final-tier match's scheduled time has arrived. We treat
 * Finals as `divisionId IS NULL` matches at the season level.
 */
export async function isFinalsLocked(seasonId: number): Promise<boolean> {
  const [first] = await db
    .select({ scheduledAt: matches.scheduledAt })
    .from(matches)
    .where(and(
      eq(matches.seasonId, seasonId),
      eq(matches.stage, "playoff"),
    ))
    .orderBy(asc(matches.scheduledAt))
    .limit(1);
  if (!first) return false;
  return new Date(first.scheduledAt).getTime() <= Date.now();
}
