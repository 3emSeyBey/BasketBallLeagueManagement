import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { brackets } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";
import { addRound1Match } from "@/lib/bracket-service";

// Add a new (empty) match box to round 1. Upper rounds rebuild automatically.
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const { id } = await params;
  const bracketId = Number(id);
  if (!Number.isFinite(bracketId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const bracket = await db.query.brackets.findFirst({ where: eq(brackets.id, bracketId) });
  if (!bracket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bm = await addRound1Match(db, bracketId);
  return NextResponse.json(bm, { status: 201 });
}
