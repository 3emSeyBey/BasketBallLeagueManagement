import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { seasons, divisions, teams, players, users } from "@/db/schema";
import { importTeams, activateSeason, endSeason } from "@/lib/season-service";
import { makeTestDb } from "./helpers/test-db";

async function makeSeason(db: Awaited<ReturnType<typeof makeTestDb>>, name: string) {
  const [s] = await db.insert(seasons).values({ name, startedAt: "2026-01-01T00:00:00.000Z" }).returning();
  return s;
}

describe("importTeams", () => {
  it("copies divisions, teams, rosters and carries the manager over", async () => {
    const db = await makeTestDb();
    const src = await makeSeason(db, "S1");
    const tgt = await makeSeason(db, "S2");
    const [div] = await db.insert(divisions).values({ seasonId: src.id, name: "North" }).returning();
    const [sharks] = await db.insert(teams).values({ name: "Sharks", divisionId: div.id }).returning();
    const [cyclones] = await db.insert(teams).values({ name: "Cyclones", divisionId: div.id }).returning();
    await db.insert(players).values([
      { teamId: sharks.id, name: "A", jerseyNumber: 1, position: "PG" },
      { teamId: sharks.id, name: "B", jerseyNumber: 2, position: "SG" },
    ]);
    const [mgr] = await db.insert(users).values({
      email: "m@x.test", passwordHash: "h", role: "team_manager", teamId: sharks.id,
    }).returning();

    await importTeams(db, tgt.id, src.id, [
      { teamId: sharks.id, includeRoster: true },
      { teamId: cyclones.id, includeRoster: false },
    ]);

    const tgtDivs = await db.select().from(divisions).where(eq(divisions.seasonId, tgt.id));
    expect(tgtDivs).toHaveLength(1);
    expect(tgtDivs[0].name).toBe("North");

    const tgtTeams = await db.select().from(teams).where(eq(teams.divisionId, tgtDivs[0].id));
    expect(tgtTeams.map((t) => t.name).sort()).toEqual(["Cyclones", "Sharks"]);

    const newSharks = tgtTeams.find((t) => t.name === "Sharks")!;
    const newCyclones = tgtTeams.find((t) => t.name === "Cyclones")!;
    const sharkRoster = await db.select().from(players).where(eq(players.teamId, newSharks.id));
    expect(sharkRoster).toHaveLength(2); // roster copied
    const cyclonesRoster = await db.select().from(players).where(eq(players.teamId, newCyclones.id));
    expect(cyclonesRoster).toHaveLength(0); // roster not requested

    const movedMgr = await db.query.users.findFirst({ where: eq(users.id, mgr.id) });
    expect(movedMgr?.teamId).toBe(newSharks.id); // manager carried over

    // source season untouched
    const srcTeams = await db.select().from(teams).where(eq(teams.divisionId, div.id));
    expect(srcTeams).toHaveLength(2);
  });

  it("does nothing with an empty selection", async () => {
    const db = await makeTestDb();
    const src = await makeSeason(db, "S1");
    const tgt = await makeSeason(db, "S2");
    await importTeams(db, tgt.id, src.id, []);
    const tgtDivs = await db.select().from(divisions).where(eq(divisions.seasonId, tgt.id));
    expect(tgtDivs).toHaveLength(0);
  });
});

describe("activateSeason", () => {
  it("activates the draft and ends the previously active season", async () => {
    const db = await makeTestDb();
    const old = await makeSeason(db, "Old");
    await db.update(seasons).set({ status: "active" }).where(eq(seasons.id, old.id));
    const draft = await makeSeason(db, "New");

    await activateSeason(db, draft.id, "2027-03-01T00:00:00.000Z");

    const oldRow = await db.query.seasons.findFirst({ where: eq(seasons.id, old.id) });
    const newRow = await db.query.seasons.findFirst({ where: eq(seasons.id, draft.id) });
    expect(oldRow?.status).toBe("ended");
    expect(oldRow?.endedAt).toBeTruthy();
    expect(newRow?.status).toBe("active");
    expect(newRow?.startedAt).toBe("2027-03-01T00:00:00.000Z");
  });
});

describe("endSeason", () => {
  it("marks a season ended with an endedAt", async () => {
    const db = await makeTestDb();
    const s = await makeSeason(db, "S");
    await db.update(seasons).set({ status: "active" }).where(eq(seasons.id, s.id));
    await endSeason(db, s.id);
    const row = await db.query.seasons.findFirst({ where: eq(seasons.id, s.id) });
    expect(row?.status).toBe("ended");
    expect(row?.endedAt).toBeTruthy();
  });
});
