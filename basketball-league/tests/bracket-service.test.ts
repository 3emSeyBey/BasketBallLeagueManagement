import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { matches as matchesTable } from "@/db/schema";
import {
  createBracket,
  addRound1Match,
  autoPlaceTeam,
  advanceWinner,
  loadBracketTree,
  eligibleTeamIds,
} from "@/lib/bracket-service";
import { makeTestDb, seedSeasonDivision, addTeam } from "./helpers/test-db";

async function endMatch(db: Awaited<ReturnType<typeof makeTestDb>>, matchId: number, home: number, away: number) {
  await db.update(matchesTable)
    .set({ status: "ended", homeScore: home, awayScore: away })
    .where(eq(matchesTable.id, matchId));
}

describe("autoPlaceTeam (default bracket)", () => {
  it("fills home, then away, then creates a second match", async () => {
    const db = await makeTestDb();
    const { division } = await seedSeasonDivision(db);
    const bracket = await createBracket(db, { divisionId: division.id, title: "Main", isDefault: true });

    const t1 = await addTeam(db, division.id, "Alpha");
    const t2 = await addTeam(db, division.id, "Bravo");
    const t3 = await addTeam(db, division.id, "Charlie");

    await autoPlaceTeam(db, division.id, t1.id);
    await autoPlaceTeam(db, division.id, t2.id);
    await autoPlaceTeam(db, division.id, t3.id);

    const tree = await loadBracketTree(db, bracket.id);
    const round1 = tree.rounds[0];
    expect(round1).toHaveLength(2);
    expect(round1[0].homeTeamId).toBe(t1.id);
    expect(round1[0].awayTeamId).toBe(t2.id);
    expect(round1[1].homeTeamId).toBe(t3.id);
    expect(round1[1].awayTeamId).toBeNull();
  });

  it("does nothing when the division has no default bracket", async () => {
    const db = await makeTestDb();
    const { division } = await seedSeasonDivision(db);
    const bracket = await createBracket(db, { divisionId: division.id, title: "Main", isDefault: false });
    const t1 = await addTeam(db, division.id, "Alpha");

    await autoPlaceTeam(db, division.id, t1.id);

    const tree = await loadBracketTree(db, bracket.id);
    expect(tree.rounds).toHaveLength(0);
  });
});

describe("structure (auto next-round boxes)", () => {
  it("two round-1 matches create one round-2 box fed by both", async () => {
    const db = await makeTestDb();
    const { division } = await seedSeasonDivision(db);
    const bracket = await createBracket(db, { divisionId: division.id, title: "Main", isDefault: false });

    await addRound1Match(db, bracket.id);
    await addRound1Match(db, bracket.id);

    const tree = await loadBracketTree(db, bracket.id);
    expect(tree.rounds).toHaveLength(2);
    expect(tree.rounds[0]).toHaveLength(2);
    expect(tree.rounds[1]).toHaveLength(1);

    const box = tree.rounds[1][0];
    expect(tree.rounds[0][0].feedsIntoId).toBe(box.bracketMatchId);
    expect(tree.rounds[0][1].feedsIntoId).toBe(box.bracketMatchId);
  });

  it("a lone round-1 match has no next-round box", async () => {
    const db = await makeTestDb();
    const { division } = await seedSeasonDivision(db);
    const bracket = await createBracket(db, { divisionId: division.id, title: "Main", isDefault: false });
    await addRound1Match(db, bracket.id);

    const tree = await loadBracketTree(db, bracket.id);
    expect(tree.rounds).toHaveLength(1);
    expect(tree.rounds[0][0].feedsIntoId).toBeNull();
  });
});

describe("advanceWinner", () => {
  it("moves the winner of an ended match into its next-round slot", async () => {
    const db = await makeTestDb();
    const { division } = await seedSeasonDivision(db);
    const bracket = await createBracket(db, { divisionId: division.id, title: "Main", isDefault: false });
    const a = await addTeam(db, division.id, "Alpha");
    const b = await addTeam(db, division.id, "Bravo");
    const c = await addTeam(db, division.id, "Charlie");
    const d = await addTeam(db, division.id, "Delta");

    const m1 = await addRound1Match(db, bracket.id);
    const m2 = await addRound1Match(db, bracket.id);
    // fill teams via the underlying matches
    await db.update(matchesTable).set({ homeTeamId: a.id, awayTeamId: b.id }).where(eq(matchesTable.id, m1.matchId));
    await db.update(matchesTable).set({ homeTeamId: c.id, awayTeamId: d.id }).where(eq(matchesTable.id, m2.matchId));

    await endMatch(db, m1.matchId, 90, 80); // Alpha wins
    await advanceWinner(db, m1.matchId);
    await endMatch(db, m2.matchId, 70, 88); // Delta wins
    await advanceWinner(db, m2.matchId);

    const tree = await loadBracketTree(db, bracket.id);
    const final = tree.rounds[1][0];
    expect(final.homeTeamId).toBe(a.id); // first feeder -> home
    expect(final.awayTeamId).toBe(d.id); // second feeder -> away
  });
});

describe("eligibleTeamIds", () => {
  it("excludes a team in a non-ended match, re-includes after it ends", async () => {
    const db = await makeTestDb();
    const { division } = await seedSeasonDivision(db);
    const bracket = await createBracket(db, { divisionId: division.id, title: "Main", isDefault: false });
    const a = await addTeam(db, division.id, "Alpha");
    const b = await addTeam(db, division.id, "Bravo");

    const m1 = await addRound1Match(db, bracket.id);
    await db.update(matchesTable).set({ homeTeamId: a.id, awayTeamId: b.id }).where(eq(matchesTable.id, m1.matchId));

    let eligible = await eligibleTeamIds(db, bracket.id);
    expect(eligible).not.toContain(a.id);
    expect(eligible).not.toContain(b.id);

    await endMatch(db, m1.matchId, 90, 80);
    eligible = await eligibleTeamIds(db, bracket.id);
    expect(eligible).toContain(a.id);
    expect(eligible).toContain(b.id);
  });
});
