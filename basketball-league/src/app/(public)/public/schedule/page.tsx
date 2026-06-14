import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { teams, seasons } from "@/db/schema";
import { loadScheduleView } from "@/lib/schedule-view";
import { Card } from "@/components/ui/card";
import { MatchRow } from "@/components/schedule/MatchRow";
import { SchedulePagination } from "@/components/schedule/SchedulePagination";
import { ScheduleDivisionControls } from "@/components/schedule/ScheduleDivisionControls";
import { ScheduleBracketSection } from "@/components/schedule/ScheduleBracketSection";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

export default async function PublicSchedule({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; division?: string }>;
}) {
  const sp = await searchParams;

  const [allTeams, seasonRows] = await Promise.all([
    db.select().from(teams),
    db.select().from(seasons).orderBy(desc(seasons.id)),
  ]);
  const activeSeason =
    seasonRows.find((s) => s.status === "active") ?? seasonRows[0] ?? null;

  const divisionId = sp.division && Number.isFinite(Number(sp.division)) ? Number(sp.division) : null;
  const requestedPage = Number(sp.page ?? "1");
  const startPage = Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1);

  const view = activeSeason
    ? await loadScheduleView({
        seasonId: activeSeason.id,
        divisionId,
        page: startPage,
        pageSize: PAGE_SIZE,
        publishedOnly: true,
      })
    : { matches: [], total: 0, totalPages: 1, page: 1, divisions: [], selectedBracket: null };

  const teamById = new Map(allTeams.map((t) => [t.id, t]));
  const pageQuery = divisionId != null ? { division: String(divisionId) } : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Schedule</h1>
        <p className="text-muted-foreground">{view.total} matches</p>
      </div>

      <ScheduleDivisionControls
        divisions={view.divisions}
        selected={divisionId != null ? String(divisionId) : "all"}
        basePath="/public/schedule"
      />

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
                view.matches.map((m) => (
                  <MatchRow key={m.id} m={m} teamById={teamById} linkPrefix="/public/schedule" />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <SchedulePagination
        page={view.page}
        totalPages={view.totalPages}
        basePath="/public/schedule"
        query={pageQuery}
      />
    </div>
  );
}
