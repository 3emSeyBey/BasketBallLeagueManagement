import Link from "next/link";
import { and, asc, desc, eq, isNull, isNotNull } from "drizzle-orm";
import { AlertTriangle } from "lucide-react";
import { db } from "@/db/client";
import { teams, seasons, matches } from "@/db/schema";
import { getSession } from "@/lib/session";
import { loadScheduleView } from "@/lib/schedule-view";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { MatchRow } from "@/components/schedule/MatchRow";
import { SchedulePagination } from "@/components/schedule/SchedulePagination";
import { ScheduleDivisionControls } from "@/components/schedule/ScheduleDivisionControls";
import { ScheduleBracketSection } from "@/components/schedule/ScheduleBracketSection";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; division?: string }>;
}) {
  const session = (await getSession())!;
  const sp = await searchParams;

  const [allTeams, seasonRows] = await Promise.all([
    db.select().from(teams),
    db.select().from(seasons).orderBy(desc(seasons.id)),
  ]);
  const season = seasonRows[0];
  const activeSeason =
    seasonRows.find((s) => s.status === "active") ?? seasonRows[0] ?? null;

  const teamById = new Map(allTeams.map((t) => [t.id, t]));

  const requestedPage = Number(sp.page ?? "1");
  const startPage = Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1);

  // Team managers only see their own team's matches, pinned to their division
  // (no division picker). Everyone else uses the ?division filter.
  const isManager = session.role === "team_manager";
  const myDivisionId = isManager && session.teamId ? teamById.get(session.teamId)?.divisionId ?? null : null;
  const teamFilter = isManager ? session.teamId ?? -1 : null;
  const divisionId = isManager
    ? myDivisionId
    : sp.division && Number.isFinite(Number(sp.division)) ? Number(sp.division) : null;

  const view = activeSeason
    ? await loadScheduleView({
        seasonId: activeSeason.id,
        divisionId,
        page: startPage,
        pageSize: PAGE_SIZE,
        publishedOnly: session.role !== "admin",
        teamId: teamFilter,
        scheduledOnly: true,
      })
    : { matches: [], total: 0, totalPages: 1, page: 1, divisions: [], selectedBracket: null };

  const pageQuery = !isManager && divisionId != null ? { division: String(divisionId) } : undefined;

  // Admin: matchups that have both teams but no date yet — nudge to schedule them.
  const unscheduled = session.role === "admin" && activeSeason
    ? await db.select().from(matches).where(and(
        eq(matches.seasonId, activeSeason.id),
        eq(matches.status, "planned"),
        isNull(matches.scheduledAt),
        isNotNull(matches.homeTeamId),
        isNotNull(matches.awayTeamId),
        ...(divisionId != null ? [eq(matches.divisionId, divisionId)] : []),
      )).orderBy(asc(matches.id))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Game Schedule</h1>
          <p className="text-muted-foreground">{view.total} matches</p>
        </div>
        {session.role === "admin" && season && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Link
              href="/schedule/new"
              className={buttonVariants({
                className: "bg-primary text-primary-foreground hover:bg-primary/90",
              })}
            >
              + Create Match
            </Link>
            <Link href="/admin/brackets" className={buttonVariants({ variant: "outline" })}>
              Manage Brackets
            </Link>
          </div>
        )}
      </div>

      {!isManager && (
        <ScheduleDivisionControls
          divisions={view.divisions}
          selected={divisionId != null ? String(divisionId) : "all"}
          basePath="/schedule"
        />
      )}

      <ScheduleBracketSection
        divisionId={divisionId}
        selectedBracket={view.selectedBracket}
        divisions={view.divisions}
        season={activeSeason?.name ?? null}
      />

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
              {view.matches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                    No matches yet.
                  </td>
                </tr>
              ) : (
                view.matches.map((m) => <MatchRow key={m.id} m={m} teamById={teamById} />)
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <SchedulePagination page={view.page} totalPages={view.totalPages} basePath="/schedule" query={pageQuery} />

      {session.role === "admin" && unscheduled.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-medium">{unscheduled.length} matchup{unscheduled.length === 1 ? "" : "s"} not scheduled yet.</p>
              <p className="text-amber-700/80 dark:text-amber-400/80">
                These have both teams set but no date — set a date so they appear on the public schedule.
              </p>
            </div>
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
                  {unscheduled.map((m) => <MatchRow key={m.id} m={m} teamById={teamById} />)}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
