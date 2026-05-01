import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches, teams, seasons } from "@/db/schema";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { MatchRow } from "@/components/schedule/MatchRow";
import { GenerateScheduleDialog } from "@/components/schedule/GenerateScheduleDialog";
import { BracketReadView } from "@/components/canvas/BracketReadView";
import { loadCanvas } from "@/lib/season-bracket-query";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const session = (await getSession())!;
  const [allMatches, allTeams, seasonRows] = await Promise.all([
    db.select().from(matches).orderBy(matches.scheduledAt),
    db.select().from(teams),
    db.select().from(seasons).orderBy(desc(seasons.id)),
  ]);
  const season = seasonRows[0];
  // Prefer the currently active season; fall back to the most recent one so
  // the bracket is still viewable after the season ends.
  const activeSeason =
    seasonRows.find((s) => s.status === "active") ?? seasonRows[0] ?? null;
  const teamById = new Map(allTeams.map((t) => [t.id, t]));
  const view = activeSeason ? await loadCanvas(activeSeason.id) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Game Schedule</h1>
          <p className="text-muted-foreground">{allMatches.length} matches</p>
        </div>
        {session.role === "admin" && season && (
          <div className="flex flex-col sm:flex-row gap-2">
            <GenerateScheduleDialog seasonId={season.id} />
            <Link
              href="/schedule/new"
              className={buttonVariants({
                className:
                  "bg-primary text-primary-foreground hover:bg-primary/90",
              })}
            >
              + Create Match
            </Link>
            {activeSeason && (
              <Link
                href={`/admin/seasons/${activeSeason.id}/canvas`}
                className={buttonVariants({ variant: "outline" })}
              >
                Open canvas
              </Link>
            )}
          </div>
        )}
      </div>

      {view && activeSeason && (view.divisions.length > 0 || view.finals.matches.length > 0) && (
        <Card className="p-6 space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">Bracket — {activeSeason.name}</h2>
            {session.role === "admin" && (
              <span className="text-xs text-muted-foreground">Open the canvas to edit</span>
            )}
          </div>
          <BracketReadView view={view} />
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
                <MatchRow key={m.id} m={m} teamById={teamById} />
              ))
            )}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
}
