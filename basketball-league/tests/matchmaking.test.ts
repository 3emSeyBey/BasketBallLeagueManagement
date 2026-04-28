import { describe, it, expect } from "vitest";
import { generateRoundRobin } from "@/lib/matchmaking";

describe("round-robin", () => {
  it("4 teams: 6 unique pairings, no team plays itself, each team plays 3 games", () => {
    const games = generateRoundRobin([1, 2, 3, 4]);
    expect(games).toHaveLength(6);
    games.forEach(([h, a]) => expect(h).not.toBe(a));
    const counts: Record<number, number> = {};
    games.forEach(([h, a]) => { counts[h] = (counts[h]||0)+1; counts[a] = (counts[a]||0)+1; });
    expect(Object.values(counts).every(c => c === 3)).toBe(true);
  });

  it("odd teams: drops a bye each round", () => {
    const games = generateRoundRobin([1, 2, 3]);
    expect(games).toHaveLength(3);
  });

  it("returns empty for <2 teams", () => {
    expect(generateRoundRobin([])).toEqual([]);
    expect(generateRoundRobin([1])).toEqual([]);
  });

  it("no duplicate pairings (treating order as unordered)", () => {
    const games = generateRoundRobin([1,2,3,4,5,6]);
    const seen = new Set<string>();
    games.forEach(([h,a]) => {
      const key = [h,a].sort().join("-");
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    });
    expect(games).toHaveLength(15);
  });
});
