import { describe, it, expect } from "vitest";
import { computeStandings } from "@/lib/standings";

const teams = [
  { id: 1, name: "A", division: "A" as const },
  { id: 2, name: "B", division: "A" as const },
  { id: 3, name: "C", division: "B" as const },
];

const matches = [
  { id: 1, homeTeamId: 1, awayTeamId: 2, status: "ended" as const, homeScore: 80, awayScore: 70 },
  { id: 2, homeTeamId: 2, awayTeamId: 1, status: "ended" as const, homeScore: 60, awayScore: 75 },
  { id: 3, homeTeamId: 1, awayTeamId: 2, status: "scheduled" as const, homeScore: 0, awayScore: 0 },
];

describe("standings", () => {
  it("counts only final matches", () => {
    const rows = computeStandings(teams, matches);
    const a = rows.find(r => r.teamId === 1)!;
    expect(a.gamesPlayed).toBe(2);
    expect(a.wins).toBe(2);
    expect(a.losses).toBe(0);
    expect(a.pointsFor).toBe(155);
    expect(a.pointsAgainst).toBe(130);
  });

  it("sorts by wins desc then point diff desc", () => {
    const rows = computeStandings(teams, matches);
    expect(rows[0].teamId).toBe(1);
    expect(rows[1].teamId).toBe(2);
  });

  it("includes teams with zero games", () => {
    const rows = computeStandings(teams, matches);
    const c = rows.find(r => r.teamId === 3)!;
    expect(c.gamesPlayed).toBe(0);
  });
});
