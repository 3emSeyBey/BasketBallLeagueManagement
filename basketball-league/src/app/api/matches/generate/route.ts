import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches, teams, seasons } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";
import { generateRoundRobin } from "@/lib/matchmaking";

const Body = z.object({
  seasonId: z.number().int().positive(),
  division: z.enum(["A", "B"]),
  startDate: z.string().datetime(),
  daysBetweenGames: z.number().int().min(1).max(14).default(3),
  venue: z.string().min(2).default("Bantayan Sports Complex"),
});

export async function POST(req: Request) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { seasonId, division, startDate, daysBetweenGames, venue } = parsed.data;

  const season = await db.query.seasons.findFirst({ where: eq(seasons.id, seasonId) });
  if (!season) return NextResponse.json({ error: "Season not found" }, { status: 404 });

  const divisionTeams = await db.select().from(teams).where(eq(teams.division, division));
  if (divisionTeams.length < 2) return NextResponse.json({ error: "Need at least 2 teams" }, { status: 400 });

  const pairings = generateRoundRobin(divisionTeams.map(t => t.id));
  const start = new Date(startDate).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const rows = pairings.map(([home, away], i) => ({
    seasonId,
    homeTeamId: home,
    awayTeamId: away,
    scheduledAt: new Date(start + i * daysBetweenGames * dayMs).toISOString(),
    venue,
    agoraChannel: `match-${seasonId}-${home}-${away}`,
  }));

  const inserted = await db.insert(matches).values(rows).returning();
  return NextResponse.json({ count: inserted.length, matches: inserted }, { status: 201 });
}
