import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { matches, teams, seasons } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { MatchRow } from "@/components/schedule/MatchRow";
import { BracketReadView } from "@/components/canvas/BracketReadView";
import { loadCanvas } from "@/lib/season-bracket-query";

export const dynamic = "force-dynamic";

export default async function PublicSchedule() {
  const [allMatches, allTeams, seasonRows] = await Promise.all([
    db.select().from(matches).orderBy(matches.scheduledAt),
    db.select().from(teams),
    db.select().from(seasons).orderBy(desc(seasons.id)),
  ]);
  const activeSeason =
    seasonRows.find((s) => s.status === "active") ?? seasonRows[0] ?? null;
  const teamById = new Map(allTeams.map((t) => [t.id, t]));
  const view = activeSeason ? await loadCanvas(activeSeason.id) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Schedule</h1>
        <p className="text-muted-foreground">{allMatches.length} matches</p>
      </div>

      {view && activeSeason && (view.divisions.length > 0 || view.finals.matches.length > 0) && (
        <Card className="p-6 space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">Bracket — {activeSeason.name}</h2>
          </div>
          <BracketReadView view={view} linkBase="/public/schedule" />
        </Card>
      )}

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
                <MatchRow
                  key={m.id}
                  m={m}
                  teamById={teamById}
                  linkPrefix="/public/schedule"
                />
              ))
            )}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
}
