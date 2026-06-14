import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches, teams, seasons } from "@/db/schema";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { MatchRow } from "@/components/schedule/MatchRow";
import { SchedulePagination } from "@/components/schedule/SchedulePagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = (await getSession())!;
  const [allTeams, seasonRows] = await Promise.all([
    db.select().from(teams),
    db.select().from(seasons).orderBy(desc(seasons.id)),
  ]);
  const season = seasonRows[0];
  // Prefer the currently active season; fall back to the most recent one so
  // the bracket is still viewable after the season ends.
  const activeSeason =
    seasonRows.find((s) => s.status === "active") ?? seasonRows[0] ?? null;

  const totalMatches = activeSeason
    ? (await db.select({ c: count() }).from(matches).where(eq(matches.seasonId, activeSeason.id)))[0].c
    : 0;
  const totalPages = Math.max(1, Math.ceil(totalMatches / PAGE_SIZE));
  const requestedPage = Number((await searchParams).page ?? "1");
  const page = Math.min(Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1), totalPages);

  // Match list mirrors the bracket — only matches from the visible season.
  const allMatches = activeSeason
    ? await db
        .select()
        .from(matches)
        .where(eq(matches.seasonId, activeSeason.id))
        .orderBy(matches.scheduledAt)
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE)
    : [];
  const teamById = new Map(allTeams.map((t) => [t.id, t]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Game Schedule</h1>
          <p className="text-muted-foreground">{totalMatches} matches</p>
        </div>
        {session.role === "admin" && season && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Link
              href="/schedule/new"
              className={buttonVariants({
                className:
                  "bg-primary text-primary-foreground hover:bg-primary/90",
              })}
            >
              + Create Match
            </Link>
            <Link
              href="/admin/brackets"
              className={buttonVariants({ variant: "outline" })}
            >
              Brackets
            </Link>
          </div>
        )}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[640px]">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Time</th>
              <th className="p-3">Matchup</th>
              <th className="p-3">Venue</th>
              <th className="p-3">Status</th>
              <th className="p-3">Score</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {allMatches.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-8 text-center text-sm text-muted-foreground"
                >
                  No matches yet.
                </td>
              </tr>
            ) : (
              allMatches.map((m) => (
                <MatchRow key={m.id} m={m} teamById={teamById} />
              ))
            )}
          </tbody>
        </table>
        </div>
      </Card>

      <SchedulePagination page={page} totalPages={totalPages} basePath="/schedule" />
    </div>
  );
}
