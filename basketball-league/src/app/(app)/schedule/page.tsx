import Link from "next/link";
import { db } from "@/db/client";
import { matches, teams, seasons } from "@/db/schema";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { MatchRow } from "@/components/schedule/MatchRow";
import { GenerateScheduleDialog } from "@/components/schedule/GenerateScheduleDialog";

export default async function SchedulePage() {
  const session = (await getSession())!;
  const [allMatches, allTeams, seasonRows] = await Promise.all([
    db.select().from(matches).orderBy(matches.scheduledAt),
    db.select().from(teams),
    db.select().from(seasons).limit(1),
  ]);
  const season = seasonRows[0];
  const teamById = new Map(allTeams.map((t) => [t.id, t]));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Game Schedule</h1>
          <p className="text-muted-foreground">{allMatches.length} matches</p>
        </div>
        {session.role === "admin" && season && (
          <div className="flex gap-2">
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
          </div>
        )}
      </div>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-left">
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
      </Card>
    </div>
  );
}
