import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { teams, matches, seasons } from "@/db/schema";
import { computeStandings } from "@/lib/standings";
import { StandingsTable } from "@/components/standings/StandingsTable";
import { BracketView } from "@/components/bracket/BracketView";
import { Card } from "@/components/ui/card";
import { getSession } from "@/lib/session";
import { loadBracket } from "@/lib/bracket-query";

export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const [session, allTeams, allMatches, activeSeason] = await Promise.all([
    getSession(),
    db.select().from(teams),
    db.select().from(matches),
    db.query.seasons.findFirst({ where: eq(seasons.status, "active") }),
  ]);
  const rows = computeStandings(allTeams, allMatches);
  const a = rows.filter(r => r.division === "A");
  const b = rows.filter(r => r.division === "B");
  const myTeamId = session?.role === "team_manager" ? session.teamId : null;

  const bracket = activeSeason ? await loadBracket(activeSeason.id) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">League Standings</h1>
        <p className="text-muted-foreground">Calculated from final match results</p>
      </div>

      {bracket && bracket.matches.length > 0 && (
        <Card className="p-6 space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">Bracket — {activeSeason!.name}</h2>
            <span className="text-xs text-muted-foreground">{bracket.seeds.length} teams</span>
          </div>
          <BracketView matches={bracket.matches} />
        </Card>
      )}

      <StandingsTable title="Division A" rows={a} highlightTeamId={myTeamId} />
      <StandingsTable title="Division B" rows={b} highlightTeamId={myTeamId} />
    </div>
  );
}
