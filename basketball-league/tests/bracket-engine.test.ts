import { describe, it, expect } from "vitest";
import {
  planRound1Placement,
  computePairing,
  computeBracketShape,
} from "@/lib/bracket-engine";

describe("planRound1Placement", () => {
  it("creates a new match (home) when there are no matches", () => {
    expect(planRound1Placement([])).toEqual({ type: "create", slot: "home" });
  });

  it("fills the away slot of an awaiting match (home set, away empty)", () => {
    expect(planRound1Placement([{ homeTeamId: 1, awayTeamId: null }]))
      .toEqual({ type: "fill", index: 0, slot: "away" });
  });

  it("creates a new match when all matches are full", () => {
    expect(planRound1Placement([{ homeTeamId: 1, awayTeamId: 2 }]))
      .toEqual({ type: "create", slot: "home" });
  });

  it("fills the first empty slot scanning home-before-away across matches", () => {
    expect(planRound1Placement([
      { homeTeamId: 1, awayTeamId: 2 },
      { homeTeamId: 3, awayTeamId: null },
    ])).toEqual({ type: "fill", index: 1, slot: "away" });
  });

  it("fills an empty home slot before away", () => {
    expect(planRound1Placement([{ homeTeamId: null, awayTeamId: null }]))
      .toEqual({ type: "fill", index: 0, slot: "home" });
  });
});

describe("computePairing", () => {
  it("zero matches produce no next-round boxes", () => {
    expect(computePairing(0)).toEqual({ nextBoxCount: 0, links: [] });
  });

  it("a lone match waits (no next-round box, no link)", () => {
    expect(computePairing(1)).toEqual({ nextBoxCount: 0, links: [null] });
  });

  it("two matches feed one next-round box as home/away", () => {
    expect(computePairing(2)).toEqual({
      nextBoxCount: 1,
      links: [{ box: 0, slot: "home" }, { box: 0, slot: "away" }],
    });
  });

  it("three matches: first pair feeds a box, third waits", () => {
    expect(computePairing(3)).toEqual({
      nextBoxCount: 1,
      links: [{ box: 0, slot: "home" }, { box: 0, slot: "away" }, null],
    });
  });

  it("four matches feed two next-round boxes", () => {
    expect(computePairing(4)).toEqual({
      nextBoxCount: 2,
      links: [
        { box: 0, slot: "home" },
        { box: 0, slot: "away" },
        { box: 1, slot: "home" },
        { box: 1, slot: "away" },
      ],
    });
  });
});

describe("computeBracketShape", () => {
  it("no round-1 matches means an empty bracket", () => {
    expect(computeBracketShape(0)).toEqual([]);
  });

  it("a single round-1 match is the whole bracket", () => {
    expect(computeBracketShape(1)).toEqual([1]);
  });

  it("two round-1 matches produce a final", () => {
    expect(computeBracketShape(2)).toEqual([2, 1]);
  });

  it("three round-1 matches keep the lone match in round 1 (one round-2 box)", () => {
    expect(computeBracketShape(3)).toEqual([3, 1]);
  });

  it("four round-1 matches build two rounds above", () => {
    expect(computeBracketShape(4)).toEqual([4, 2, 1]);
  });

  it("five round-1 matches: 5 -> 2 -> 1", () => {
    expect(computeBracketShape(5)).toEqual([5, 2, 1]);
  });

  it("eight round-1 matches build a full four-round tree", () => {
    expect(computeBracketShape(8)).toEqual([8, 4, 2, 1]);
  });
});
