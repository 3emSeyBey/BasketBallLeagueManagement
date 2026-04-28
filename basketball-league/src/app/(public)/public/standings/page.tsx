import { db } from "@/db/client";
import { teams, matches } from "@/db/schema";
import { computeStandings } from "@/lib/standings";
import { StandingsTable } from "@/components/standings/StandingsTable";

export const dynamic = "force-dynamic";

export default async function PublicStandings() {
  const [allTeams, allMatches] = await Promise.all([
    db.select().from(teams),
    db.select().from(matches),
  ]);
  const rows = computeStandings(allTeams, allMatches);
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Standings</h1>
      <StandingsTable title="Division A" rows={rows.filter((r) => r.division === "A")} />
      <StandingsTable title="Division B" rows={rows.filter((r) => r.division === "B")} />
    </div>
  );
}
