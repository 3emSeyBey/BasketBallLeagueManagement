import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { seasons } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";
import { activateSeason } from "@/lib/season-service";
import { logAudit } from "@/lib/audit";

const Body = z.object({ startedAt: z.string().datetime() });

// Activate a draft season (sets its start date) and end the current active one.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try { session = requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const { id } = await params;
  const seasonId = Number(id);
  if (!Number.isFinite(seasonId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const season = await db.query.seasons.findFirst({ where: eq(seasons.id, seasonId) });
  if (!season) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (season.status !== "draft") return NextResponse.json({ error: "Only a draft season can be activated" }, { status: 409 });

  await activateSeason(db, seasonId, parsed.data.startedAt);
  await logAudit(db, {
    actorId: session.userId, action: "season.activate",
    targetType: "season", targetId: seasonId,
  });
  return NextResponse.json({ ok: true });
}
