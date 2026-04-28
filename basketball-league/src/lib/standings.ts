type TeamLite = { id: number; name: string; division: "A" | "B" };
type MatchLite = { id: number; homeTeamId: number; awayTeamId: number; status: "scheduled"|"live"|"final"; homeScore: number; awayScore: number };

export type StandingRow = {
  teamId: number;
  teamName: string;
  division: "A" | "B";
  gamesPlayed: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
};

export function computeStandings(teams: TeamLite[], matches: MatchLite[]): StandingRow[] {
  const rows = new Map<number, StandingRow>();
  teams.forEach(t => rows.set(t.id, {
    teamId: t.id, teamName: t.name, division: t.division,
    gamesPlayed: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, pointDiff: 0,
  }));

  matches.filter(m => m.status === "final").forEach(m => {
    const h = rows.get(m.homeTeamId); const a = rows.get(m.awayTeamId);
    if (!h || !a) return;
    h.gamesPlayed++; a.gamesPlayed++;
    h.pointsFor += m.homeScore; h.pointsAgainst += m.awayScore;
    a.pointsFor += m.awayScore; a.pointsAgainst += m.homeScore;
    if (m.homeScore > m.awayScore) { h.wins++; a.losses++; }
    else if (m.awayScore > m.homeScore) { a.wins++; h.losses++; }
  });

  return Array.from(rows.values())
    .map(r => ({ ...r, pointDiff: r.pointsFor - r.pointsAgainst }))
    .sort((a, b) => {
      // Teams with games played come before teams with no games
      const aPlayed = a.gamesPlayed > 0 ? 1 : 0;
      const bPlayed = b.gamesPlayed > 0 ? 1 : 0;
      return bPlayed - aPlayed
        || b.wins - a.wins
        || b.pointDiff - a.pointDiff
        || a.teamName.localeCompare(b.teamName);
    });
}
