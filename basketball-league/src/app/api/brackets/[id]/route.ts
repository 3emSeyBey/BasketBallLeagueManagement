import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { brackets, bracketMatches, matches, divisions, seasons, teams } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";
import { loadBracketTree, setDefaultBracket, eligibleTeamIds } from "@/lib/bracket-service";

const Update = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  isPublished: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

// Full bracket: structure (rounds of boxes) + division/season meta + the teams
// still eligible to be dropped into an open slot.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bracketId = Number(id);
  if (!Number.isFinite(bracketId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const session = await getSession();
  const tree = await loadBracketTree(db, bracketId).catch(() => null);
  if (!tree) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!tree.bracket.isPublished && session?.role !== "admin") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const division = await db.query.divisions.findFirst({ where: eq(divisions.id, tree.bracket.divisionId) });
  const season = division ? await db.query.seasons.findFirst({ where: eq(seasons.id, division.seasonId) }) : null;

  const eligibleIds = await eligibleTeamIds(db, bracketId);
  const divTeams = division
    ? await db.select({ id: teams.id, name: teams.name }).from(teams).where(eq(teams.divisionId, division.id))
    : [];
  const eligibleTeams = divTeams.filter((t) => eligibleIds.includes(t.id));

  return NextResponse.json({
    bracket: tree.bracket,
    rounds: tree.rounds,
    division: division ? { id: division.id, name: division.name } : null,
    season: season ? { id: season.id, name: season.name } : null,
    divisionTeams: divTeams,
    eligibleTeams,
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const { id } = await params;
  const bracketId = Number(id);
  if (!Number.isFinite(bracketId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const parsed = Update.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await db.query.brackets.findFirst({ where: eq(brackets.id, bracketId) });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.isDefault === true) {
    await setDefaultBracket(db, bracketId);
  } else if (parsed.data.isDefault === false) {
    await db.update(brackets).set({ isDefault: false }).where(eq(brackets.id, bracketId));
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.isPublished !== undefined) patch.isPublished = parsed.data.isPublished;
  if (Object.keys(patch).length > 0) {
    await db.update(brackets).set(patch).where(eq(brackets.id, bracketId));
  }

  const updated = await db.query.brackets.findFirst({ where: eq(brackets.id, bracketId) });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const { id } = await params;
  const bracketId = Number(id);
  if (!Number.isFinite(bracketId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  // Remove the bracket (cascades bracket_matches) then its now-orphaned matches.
  const boxes = await db.select({ matchId: bracketMatches.matchId })
    .from(bracketMatches).where(eq(bracketMatches.bracketId, bracketId));
  await db.delete(brackets).where(eq(brackets.id, bracketId));
  for (const b of boxes) await db.delete(matches).where(eq(matches.id, b.matchId));
  return NextResponse.json({ ok: true });
}
