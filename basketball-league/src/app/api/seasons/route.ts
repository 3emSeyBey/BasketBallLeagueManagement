import { NextResponse } from "next/server";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { seasons } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";
import { importTeams } from "@/lib/season-service";
import { logAudit } from "@/lib/audit";

const Create = z.object({
  name: z.string().min(2).max(80),
  import: z.object({
    sourceSeasonId: z.number().int().positive(),
    teams: z.array(z.object({
      teamId: z.number().int().positive(),
      includeRoster: z.boolean(),
    })),
  }).optional(),
});

export async function GET() {
  const rows = await db.select().from(seasons).orderBy(desc(seasons.id));
  return NextResponse.json(rows);
}

/**
 * Create a new season in `draft` status. The start date is set later at
 * activation. Optionally imports divisions/teams/rosters from a past season.
 */
export async function POST(req: Request) {
  let session;
  try { session = requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const parsed = Create.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  let season;
  try {
    [season] = await db.insert(seasons).values({
      name: parsed.data.name,
      startedAt: new Date().toISOString(), // placeholder, set on activation
      status: "draft",
    }).returning();
  } catch {
    return NextResponse.json({ error: "Season name already exists" }, { status: 409 });
  }

  if (parsed.data.import && parsed.data.import.teams.length > 0) {
    await importTeams(db, season.id, parsed.data.import.sourceSeasonId, parsed.data.import.teams);
  }

  await logAudit(db, {
    actorId: session.userId, action: "season.create",
    targetType: "season", targetId: season.id, meta: { name: season.name },
  });

  return NextResponse.json({ id: season.id }, { status: 201 });
}
