import { db } from "@/db/client";
import { teams, matches } from "@/db/schema";
import { computeStandings } from "@/lib/standings";
import { StandingsTable } from "@/components/standings/StandingsTable";

export default async function StandingsPage() {
  const [allTeams, allMatches] = await Promise.all([db.select().from(teams), db.select().from(matches)]);
  const rows = computeStandings(allTeams, allMatches);
  const a = rows.filter(r => r.division === "A");
  const b = rows.filter(r => r.division === "B");
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">League Standings</h1>
        <p className="text-muted-foreground">Calculated from final match results</p>
      </div>
      <StandingsTable title="Division A" rows={a}/>
      <StandingsTable title="Division B" rows={b}/>
    </div>
  );
}
