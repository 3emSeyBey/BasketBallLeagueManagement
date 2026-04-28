import { db } from "@/db/client";
import { matches, teams } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { MatchRow } from "@/components/schedule/MatchRow";

export default async function PublicSchedule() {
  const [allMatches, allTeams] = await Promise.all([
    db.select().from(matches).orderBy(matches.scheduledAt),
    db.select().from(teams),
  ]);
  const teamById = new Map(allTeams.map((t) => [t.id, t]));
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Schedule</h1>
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
      </Card>
    </div>
  );
}
