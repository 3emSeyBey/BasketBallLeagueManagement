import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { brackets } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";
import { saveBracket } from "@/lib/bracket-service";
import { assertBracketEditable, SeasonLockedError } from "@/lib/season-guard";
import { logAudit } from "@/lib/audit";

const Box = z.object({
  bracketMatchId: z.number().int().positive().nullable(),
  homeTeamId: z.number().int().positive().nullable(),
  awayTeamId: z.number().int().positive().nullable(),
  scheduledAt: z.string().datetime().nullable(),
  venue: z.string().max(120).nullable(),
});

const Body = z.object({
  title: z.string().trim().min(1).max(120),
  isDefault: z.boolean(),
  rounds: z.array(z.array(Box)),
});

// Commit the whole draft bracket and publish it.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try { session = requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const { id } = await params;
  const bracketId = Number(id);
  if (!Number.isFinite(bracketId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const exists = await db.query.brackets.findFirst({ where: eq(brackets.id, bracketId) });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try { await assertBracketEditable(bracketId); }
  catch (e) { if (e instanceof SeasonLockedError) return NextResponse.json({ error: e.message }, { status: 409 }); throw e; }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const tree = await saveBracket(db, bracketId, parsed.data);
  await logAudit(db, {
    actorId: session.userId, action: "bracket.save",
    targetType: "bracket", targetId: bracketId, meta: { title: parsed.data.title },
  });
  return NextResponse.json(tree);
}
