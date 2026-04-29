import { describe, it, expect } from "vitest";
import { nextPowerOfTwo, standardSeedOrder, buildSingleEliminationPlan } from "@/lib/bracket";

describe("nextPowerOfTwo", () => {
  it("rounds up", () => {
    expect(nextPowerOfTwo(1)).toBe(1);
    expect(nextPowerOfTwo(2)).toBe(2);
    expect(nextPowerOfTwo(3)).toBe(4);
    expect(nextPowerOfTwo(5)).toBe(8);
    expect(nextPowerOfTwo(8)).toBe(8);
    expect(nextPowerOfTwo(9)).toBe(16);
  });
});

describe("standardSeedOrder", () => {
  it("pairs top vs bottom for size 4", () => {
    expect(standardSeedOrder(4)).toEqual([1, 4, 2, 3]);
  });
  it("standard 8-team order", () => {
    expect(standardSeedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });
  it("rejects non power of two", () => {
    expect(() => standardSeedOrder(6)).toThrow();
  });
});

describe("buildSingleEliminationPlan", () => {
  it("4-team plan has 3 matches across 2 rounds", () => {
    const p = buildSingleEliminationPlan(4);
    expect(p.size).toBe(4);
    expect(p.rounds).toBe(2);
    expect(p.matches).toHaveLength(3);
    // Round 1 should pair (1,4) and (2,3)
    const r1 = p.matches.filter(m => m.round === 1).sort((a, b) => a.position - b.position);
    expect(r1[0].homeSeed).toBe(1);
    expect(r1[0].awaySeed).toBe(4);
    expect(r1[1].homeSeed).toBe(2);
    expect(r1[1].awaySeed).toBe(3);
    // Round 1 winners advance to Round 2 position 0
    expect(r1[0].nextPosition).toBe(0);
    expect(r1[0].nextSlot).toBe("home");
    expect(r1[1].nextSlot).toBe("away");
  });

  it("3-team plan pads to 4 with bye structure", () => {
    const p = buildSingleEliminationPlan(3);
    expect(p.size).toBe(4);
    expect(p.matches).toHaveLength(3);
  });

  it("8-team plan has 7 matches and 3 rounds", () => {
    const p = buildSingleEliminationPlan(8);
    expect(p.size).toBe(8);
    expect(p.rounds).toBe(3);
    expect(p.matches).toHaveLength(7);
    expect(p.matches.filter(m => m.round === 3)).toHaveLength(1);
    const final = p.matches.find(m => m.round === 3)!;
    expect(final.nextPosition).toBe(null);
    expect(final.nextSlot).toBe(null);
  });
});
