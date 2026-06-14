// Pure bracket geometry. No DB access — these functions decide structure and
// placement; the service layer applies the results to the database.

export type Round1Slot = { homeTeamId: number | null; awayTeamId: number | null };

export type Placement =
  | { type: "fill"; index: number; slot: "home" | "away" }
  | { type: "create"; slot: "home" };

// Where does a newly-added team go in the default bracket's round 1?
// Scan matches in order, filling the first empty slot (home before away).
// If every slot is full, create a new match with the team in the home slot.
export function planRound1Placement(slots: Round1Slot[]): Placement {
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].homeTeamId == null) return { type: "fill", index: i, slot: "home" };
    if (slots[i].awayTeamId == null) return { type: "fill", index: i, slot: "away" };
  }
  return { type: "create", slot: "home" };
}

export type PairLink = { box: number; slot: "home" | "away" } | null;
export type Pairing = { nextBoxCount: number; links: PairLink[] };

// Pair adjacent matches in a round (0+1 -> box 0, 2+3 -> box 1, ...).
// A lone trailing match has no next-round box yet (it "waits").
export function computePairing(count: number): Pairing {
  const links: PairLink[] = [];
  for (let i = 0; i < count; i++) {
    const box = Math.floor(i / 2);
    const paired = box < Math.floor(count / 2);
    links.push(paired ? { box, slot: i % 2 === 0 ? "home" : "away" } : null);
  }
  return { nextBoxCount: Math.floor(count / 2), links };
}

// Given the number of round-1 matches, the whole bracket shape is determined:
// each round above has floor(prev / 2) boxes; a lone match waits in its round.
// Returns box counts per round (index 0 = round 1). Empty when there are none.
export function computeBracketShape(round1Count: number): number[] {
  if (round1Count < 1) return [];
  const rounds = [round1Count];
  let cur = round1Count;
  while (cur >= 2) {
    cur = Math.floor(cur / 2);
    rounds.push(cur);
  }
  return rounds;
}
