import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { seasons, seasonTeams, matches } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";
import { buildSingleEliminationPlan } from "@/lib/bracket";

const Body = z.object({
  teamOrder: z.array(z.number().int().positive()).min(2),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const { id } = await params;
  const seasonId = Number(id);
  if (!Number.isFinite(seasonId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const season = await db.query.seasons.findFirst({ where: eq(seasons.id, seasonId) });
  if (!season) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (season.status !== "draft") return NextResponse.json({ error: "Bracket is locked" }, { status: 400 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await db.select().from(seasonTeams).where(eq(seasonTeams.seasonId, seasonId));
  const existingIds = new Set(existing.map(r => r.teamId));
  const incomingIds = new Set(parsed.data.teamOrder);
  if (existingIds.size !== incomingIds.size || ![...existingIds].every(id => incomingIds.has(id))) {
    return NextResponse.json({ error: "Team set must match the season's existing teams" }, { status: 400 });
  }

  // Two-step: temporarily shift seeds out of range to avoid unique constraint, then re-assign.
  await db.update(seasonTeams).set({ seed: -1 }).where(eq(seasonTeams.seasonId, seasonId));
  // Apply new seeds one-by-one (libsql batch isn't simpler here)
  for (let i = 0; i < parsed.data.teamOrder.length; i++) {
    const teamId = parsed.data.teamOrder[i];
    const seed = i + 1;
    // negative-seed temp dance: bump to seed*-1 then to final to ensure no collisions during interim
    await db.update(seasonTeams)
      .set({ seed: -seed - 1000 })
      .where(and(eq(seasonTeams.seasonId, seasonId), eq(seasonTeams.teamId, teamId)));
  }
  for (let i = 0; i < parsed.data.teamOrder.length; i++) {
    const teamId = parsed.data.teamOrder[i];
    await db.update(seasonTeams)
      .set({ seed: i + 1 })
      .where(and(eq(seasonTeams.seasonId, seasonId), eq(seasonTeams.teamId, teamId)));
  }

  // Recompute first-round home/away assignments
  const plan = buildSingleEliminationPlan(parsed.data.teamOrder.length);
  const seedToTeamId: Record<number, number | null> = {};
  for (let i = 0; i < plan.size; i++) {
    seedToTeamId[i + 1] = i < parsed.data.teamOrder.length ? parsed.data.teamOrder[i] : null;
  }
  const firstRoundMatches = await db.select().from(matches)
    .where(and(eq(matches.seasonId, seasonId), eq(matches.round, 1)));
  for (const m of firstRoundMatches) {
    const planMatch = plan.matches.find(p => p.round === 1 && p.position === m.bracketPosition);
    if (!planMatch) continue;
    await db.update(matches).set({
      homeTeamId: planMatch.homeSeed ? seedToTeamId[planMatch.homeSeed] : null,
      awayTeamId: planMatch.awaySeed ? seedToTeamId[planMatch.awaySeed] : null,
    }).where(eq(matches.id, m.id));
  }

  return NextResponse.json({ ok: true });
}
