export type BracketSeed = { seed: number; teamId: number | null };

export type BracketMatchPlan = {
  round: number;
  position: number;
  homeSeed: number | null;
  awaySeed: number | null;
  nextPosition: number | null;
  nextSlot: "home" | "away" | null;
};

export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Standard tournament seeding: pair top vs bottom across the bracket so
 * higher seeds avoid each other until later rounds.
 * Returns ordered array of seeds (1-based) describing the slot order.
 * For size 8 → [1, 8, 4, 5, 2, 7, 3, 6].
 */
export function standardSeedOrder(size: number): number[] {
  if (size < 2 || (size & (size - 1)) !== 0) {
    throw new Error("Size must be a power of 2 ≥ 2");
  }
  let order = [1, 2];
  while (order.length < size) {
    const sum = order.length * 2 + 1;
    const next: number[] = [];
    for (const s of order) {
      next.push(s);
      next.push(sum - s);
    }
    order = next;
  }
  return order;
}

/**
 * Build a single-elimination bracket plan.
 * @param teamCount number of real teams
 * Pads with byes (teamId=null in seeds) up to next power of 2.
 * Returns a list of matches keyed by (round, position) with optional advancement pointers.
 */
export function buildSingleEliminationPlan(teamCount: number): {
  size: number;
  rounds: number;
  matches: BracketMatchPlan[];
} {
  const size = nextPowerOfTwo(Math.max(teamCount, 2));
  const rounds = Math.log2(size);
  const seedOrder = standardSeedOrder(size);

  const matches: BracketMatchPlan[] = [];

  // Round 1
  const firstRoundCount = size / 2;
  for (let i = 0; i < firstRoundCount; i++) {
    const homeSeed = seedOrder[i * 2];
    const awaySeed = seedOrder[i * 2 + 1];
    const nextPosition = Math.floor(i / 2);
    const nextSlot: "home" | "away" = i % 2 === 0 ? "home" : "away";
    matches.push({
      round: 1,
      position: i,
      homeSeed,
      awaySeed,
      nextPosition: rounds > 1 ? nextPosition : null,
      nextSlot: rounds > 1 ? nextSlot : null,
    });
  }

  // Rounds 2..rounds
  for (let r = 2; r <= rounds; r++) {
    const count = size / 2 ** r;
    for (let i = 0; i < count; i++) {
      const last = r === rounds;
      matches.push({
        round: r,
        position: i,
        homeSeed: null,
        awaySeed: null,
        nextPosition: last ? null : Math.floor(i / 2),
        nextSlot: last ? null : (i % 2 === 0 ? "home" : "away"),
      });
    }
  }

  return { size, rounds, matches };
}
