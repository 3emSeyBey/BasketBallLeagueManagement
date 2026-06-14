import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches, teams, seasons } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { MatchRow } from "@/components/schedule/MatchRow";

export const dynamic = "force-dynamic";

export default async function PublicSchedule() {
  const [allTeams, seasonRows] = await Promise.all([
    db.select().from(teams),
    db.select().from(seasons).orderBy(desc(seasons.id)),
  ]);
  const activeSeason =
    seasonRows.find((s) => s.status === "active") ?? seasonRows[0] ?? null;
  const allMatches = activeSeason
    ? await db
        .select()
        .from(matches)
        .where(eq(matches.seasonId, activeSeason.id))
        .orderBy(matches.scheduledAt)
    : [];
  const teamById = new Map(allTeams.map((t) => [t.id, t]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Schedule</h1>
        <p className="text-muted-foreground">{allMatches.length} matches</p>
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
