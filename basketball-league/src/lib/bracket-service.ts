import { and, asc, eq, ne } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";
import { brackets, bracketMatches, matches, divisions, teams } from "@/db/schema";
import { planRound1Placement, computePairing, computeBracketShape } from "./bracket-engine";

type Database = LibSQLDatabase<typeof schema>;

export type BracketBox = {
  bracketMatchId: number;
  matchId: number;
  roundIndex: number;
  slotIndex: number;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeTeamName: string | null;
  awayTeamName: string | null;
  homeTeamLogo: boolean;
  awayTeamLogo: boolean;
  status: string;
  homeScore: number;
  awayScore: number;
  scheduledAt: string | null;
  venue: string | null;
  feedsIntoId: number | null;
};

export type BracketTree = {
  bracket: schema.Bracket;
  rounds: BracketBox[][];
};

async function seasonIdForDivision(db: Database, divisionId: number): Promise<number> {
  const div = await db.query.divisions.findFirst({ where: eq(divisions.id, divisionId) });
  if (!div) throw new Error("Division not found");
  return div.seasonId;
}

// Create a planned match + bracket_match box in round 1.
async function createRound1Box(
  db: Database,
  bracket: schema.Bracket,
  slotIndex: number,
  homeTeamId: number | null = null,
) {
  const seasonId = await seasonIdForDivision(db, bracket.divisionId);
  const [match] = await db.insert(matches).values({
    seasonId,
    divisionId: bracket.divisionId,
    homeTeamId,
    status: "planned",
  }).returning();
  const [bm] = await db.insert(bracketMatches).values({
    bracketId: bracket.id,
    matchId: match.id,
    roundIndex: 0,
    slotIndex,
  }).returning();
  return bm;
}

export async function createBracket(
  db: Database,
  input: { divisionId: number; title: string; isDefault?: boolean },
): Promise<schema.Bracket> {
  if (input.isDefault) {
    await db.update(brackets).set({ isDefault: false }).where(eq(brackets.divisionId, input.divisionId));
  }
  const [b] = await db.insert(brackets).values({
    divisionId: input.divisionId,
    title: input.title,
    isDefault: !!input.isDefault,
  }).returning();
  return b;
}

export async function setDefaultBracket(db: Database, bracketId: number): Promise<void> {
  const b = await db.query.brackets.findFirst({ where: eq(brackets.id, bracketId) });
  if (!b) throw new Error("Bracket not found");
  await db.update(brackets).set({ isDefault: false }).where(eq(brackets.divisionId, b.divisionId));
  await db.update(brackets).set({ isDefault: true }).where(eq(brackets.id, bracketId));
}

export async function addRound1Match(db: Database, bracketId: number) {
  const bracket = await db.query.brackets.findFirst({ where: eq(brackets.id, bracketId) });
  if (!bracket) throw new Error("Bracket not found");
  const existing = await db.select().from(bracketMatches)
    .where(and(eq(bracketMatches.bracketId, bracketId), eq(bracketMatches.roundIndex, 0)));
  const bm = await createRound1Box(db, bracket, existing.length);
  await rebuildStructure(db, bracketId);
  return bm;
}

// Recompute upper-round blank boxes and feedsInto links from the round-1 count.
export async function rebuildStructure(db: Database, bracketId: number): Promise<void> {
  const bracket = await db.query.brackets.findFirst({ where: eq(brackets.id, bracketId) });
  if (!bracket) throw new Error("Bracket not found");
  const seasonId = await seasonIdForDivision(db, bracket.divisionId);

  const loadRounds = async () => {
    const all = await db.select().from(bracketMatches)
      .where(eq(bracketMatches.bracketId, bracketId))
      .orderBy(asc(bracketMatches.roundIndex), asc(bracketMatches.slotIndex));
    const rounds: (typeof all)[] = [];
    for (const bm of all) {
      (rounds[bm.roundIndex] ||= []).push(bm);
    }
    return rounds;
  };

  let rounds = await loadRounds();
  const n = rounds[0]?.length ?? 0;
  const shape = computeBracketShape(n);

  // Ensure each round above round 1 has exactly shape[r] boxes.
  for (let r = 1; r < shape.length; r++) {
    const existing = rounds[r] ?? [];
    if (existing.length < shape[r]) {
      for (let k = existing.length; k < shape[r]; k++) {
        const [match] = await db.insert(matches).values({
          seasonId, divisionId: bracket.divisionId, status: "planned",
        }).returning();
        await db.insert(bracketMatches).values({
          bracketId, matchId: match.id, roundIndex: r, slotIndex: k,
        });
      }
    } else if (existing.length > shape[r]) {
      const extras = existing.slice(shape[r]);
      for (const bm of extras) {
        await db.delete(bracketMatches).where(eq(bracketMatches.id, bm.id));
        await db.delete(matches).where(eq(matches.id, bm.matchId));
      }
    }
  }
  // Remove any boxes in rounds beyond the computed shape.
  for (let r = shape.length; r < rounds.length; r++) {
    for (const bm of rounds[r] ?? []) {
      await db.delete(bracketMatches).where(eq(bracketMatches.id, bm.id));
      await db.delete(matches).where(eq(matches.id, bm.matchId));
    }
  }

  rounds = await loadRounds();

  // Wire feedsInto links per pairing.
  for (let r = 0; r < shape.length; r++) {
    const here = rounds[r] ?? [];
    const next = rounds[r + 1] ?? [];
    const pairing = computePairing(here.length);
    for (let i = 0; i < here.length; i++) {
      const link = pairing.links[i];
      const target = link && next[link.box] ? next[link.box].id : null;
      if (here[i].feedsIntoId !== target) {
        await db.update(bracketMatches).set({ feedsIntoId: target }).where(eq(bracketMatches.id, here[i].id));
      }
    }
  }
}

export async function removeBracketMatch(db: Database, bracketMatchId: number): Promise<void> {
  const bm = await db.query.bracketMatches.findFirst({ where: eq(bracketMatches.id, bracketMatchId) });
  if (!bm) return;
  await db.delete(bracketMatches).where(eq(bracketMatches.id, bracketMatchId));
  await db.delete(matches).where(eq(matches.id, bm.matchId));
  // Re-pack round-1 slot indexes so they stay contiguous.
  const round1 = await db.select().from(bracketMatches)
    .where(and(eq(bracketMatches.bracketId, bm.bracketId), eq(bracketMatches.roundIndex, 0)))
    .orderBy(asc(bracketMatches.slotIndex));
  for (let i = 0; i < round1.length; i++) {
    if (round1[i].slotIndex !== i) {
      await db.update(bracketMatches).set({ slotIndex: i }).where(eq(bracketMatches.id, round1[i].id));
    }
  }
  await rebuildStructure(db, bm.bracketId);
}

export async function eligibleTeamIds(db: Database, bracketId: number): Promise<number[]> {
  const bracket = await db.query.brackets.findFirst({ where: eq(brackets.id, bracketId) });
  if (!bracket) return [];
  const divTeams = await db.select({ id: teams.id }).from(teams).where(eq(teams.divisionId, bracket.divisionId));

  // Teams already placed in a non-ended match within this bracket are busy.
  const placed = await db.select({
    homeTeamId: matches.homeTeamId,
    awayTeamId: matches.awayTeamId,
  }).from(bracketMatches)
    .innerJoin(matches, eq(bracketMatches.matchId, matches.id))
    .where(and(eq(bracketMatches.bracketId, bracketId), ne(matches.status, "ended")));

  const busy = new Set<number>();
  for (const row of placed) {
    if (row.homeTeamId != null) busy.add(row.homeTeamId);
    if (row.awayTeamId != null) busy.add(row.awayTeamId);
  }
  return divTeams.map((t) => t.id).filter((id) => !busy.has(id));
}

export async function setSlot(
  db: Database,
  bracketMatchId: number,
  slot: "home" | "away",
  teamId: number | null,
): Promise<void> {
  const bm = await db.query.bracketMatches.findFirst({ where: eq(bracketMatches.id, bracketMatchId) });
  if (!bm) throw new Error("Bracket match not found");
  if (teamId != null) {
    const eligible = await eligibleTeamIds(db, bm.bracketId);
    const current = await db.query.matches.findFirst({ where: eq(matches.id, bm.matchId) });
    const alreadyHere = current && (current.homeTeamId === teamId || current.awayTeamId === teamId);
    if (!eligible.includes(teamId) && !alreadyHere) {
      throw new Error("Team is not eligible (already in an unfinished match in this bracket)");
    }
  }
  const col = slot === "home" ? { homeTeamId: teamId } : { awayTeamId: teamId };
  await db.update(matches).set(col).where(eq(matches.id, bm.matchId));
}

export async function autoPlaceTeam(db: Database, divisionId: number, teamId: number): Promise<void> {
  const bracket = await db.query.brackets.findFirst({
    where: and(eq(brackets.divisionId, divisionId), eq(brackets.isDefault, true)),
  });
  if (!bracket) return;

  const round1 = await db.select({
    bmId: bracketMatches.id,
    matchId: bracketMatches.matchId,
    homeTeamId: matches.homeTeamId,
    awayTeamId: matches.awayTeamId,
  }).from(bracketMatches)
    .innerJoin(matches, eq(bracketMatches.matchId, matches.id))
    .where(and(eq(bracketMatches.bracketId, bracket.id), eq(bracketMatches.roundIndex, 0)))
    .orderBy(asc(bracketMatches.slotIndex));

  const placement = planRound1Placement(
    round1.map((r) => ({ homeTeamId: r.homeTeamId, awayTeamId: r.awayTeamId })),
  );

  if (placement.type === "fill") {
    const target = round1[placement.index];
    const col = placement.slot === "home" ? { homeTeamId: teamId } : { awayTeamId: teamId };
    await db.update(matches).set(col).where(eq(matches.id, target.matchId));
  } else {
    await createRound1Box(db, bracket, round1.length, teamId);
    await rebuildStructure(db, bracket.id);
  }
}

// When a match ends, push its winner into the connected next-round slot.
// Returns the bracket champion's team id if this was the final, else null.
export async function advanceWinner(db: Database, matchId: number): Promise<{ championTeamId: number | null }> {
  const bm = await db.query.bracketMatches.findFirst({ where: eq(bracketMatches.matchId, matchId) });
  if (!bm) return { championTeamId: null };
  const match = await db.query.matches.findFirst({ where: eq(matches.id, matchId) });
  if (!match || match.status !== "ended" || match.homeScore === match.awayScore) return { championTeamId: null };

  const winnerTeamId = match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId;
  if (winnerTeamId == null) return { championTeamId: null };

  if (bm.feedsIntoId == null) {
    return { championTeamId: winnerTeamId };
  }

  // Which slot of the next box does this match feed?
  const round = await db.select().from(bracketMatches)
    .where(and(eq(bracketMatches.bracketId, bm.bracketId), eq(bracketMatches.roundIndex, bm.roundIndex)))
    .orderBy(asc(bracketMatches.slotIndex));
  const pairing = computePairing(round.length);
  const idx = round.findIndex((r) => r.id === bm.id);
  const link = pairing.links[idx];
  if (!link) return { championTeamId: null };

  const target = await db.query.bracketMatches.findFirst({ where: eq(bracketMatches.id, bm.feedsIntoId) });
  if (!target) return { championTeamId: null };
  const col = link.slot === "home" ? { homeTeamId: winnerTeamId } : { awayTeamId: winnerTeamId };
  await db.update(matches).set(col).where(eq(matches.id, target.matchId));
  return { championTeamId: null };
}

export async function loadBracketTree(db: Database, bracketId: number): Promise<BracketTree> {
  const bracket = await db.query.brackets.findFirst({ where: eq(brackets.id, bracketId) });
  if (!bracket) throw new Error("Bracket not found");

  const rows = await db.select({
    bracketMatchId: bracketMatches.id,
    matchId: bracketMatches.matchId,
    roundIndex: bracketMatches.roundIndex,
    slotIndex: bracketMatches.slotIndex,
    feedsIntoId: bracketMatches.feedsIntoId,
    homeTeamId: matches.homeTeamId,
    awayTeamId: matches.awayTeamId,
    status: matches.status,
    homeScore: matches.homeScore,
    awayScore: matches.awayScore,
    scheduledAt: matches.scheduledAt,
    venue: matches.venue,
  }).from(bracketMatches)
    .innerJoin(matches, eq(bracketMatches.matchId, matches.id))
    .where(eq(bracketMatches.bracketId, bracketId))
    .orderBy(asc(bracketMatches.roundIndex), asc(bracketMatches.slotIndex));

  const teamRows = await db.select({ id: teams.id, name: teams.name, imageMimeType: teams.imageMimeType })
    .from(teams).where(eq(teams.divisionId, bracket.divisionId));
  const teamName = new Map(teamRows.map((t) => [t.id, t.name]));
  const teamLogo = new Set(teamRows.filter((t) => t.imageMimeType != null).map((t) => t.id));

  const rounds: BracketBox[][] = [];
  for (const r of rows) {
    (rounds[r.roundIndex] ||= []).push({
      ...r,
      homeTeamName: r.homeTeamId != null ? teamName.get(r.homeTeamId) ?? null : null,
      awayTeamName: r.awayTeamId != null ? teamName.get(r.awayTeamId) ?? null : null,
      homeTeamLogo: r.homeTeamId != null && teamLogo.has(r.homeTeamId),
      awayTeamLogo: r.awayTeamId != null && teamLogo.has(r.awayTeamId),
    });
  }
  // Collapse any holes so callers get a dense array.
  return { bracket, rounds: rounds.filter(Boolean) };
}
