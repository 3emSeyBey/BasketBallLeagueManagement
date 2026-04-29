import { NextResponse } from "next/server";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { seasons } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

const Create = z.object({
  name: z.string().min(2).max(80),
  startedAt: z.string().datetime(),
});

export async function GET() {
  const rows = await db.select().from(seasons).orderBy(desc(seasons.id));
  return NextResponse.json(rows);
}

/**
 * Create a new empty season in `draft` status. Admins add divisions and teams
 * after creation via /api/seasons/[id]/divisions and /api/seasons/[id]/teams.
 */
export async function POST(req: Request) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const parsed = Create.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const [season] = await db.insert(seasons).values({
      name: parsed.data.name,
      startedAt: parsed.data.startedAt,
      status: "draft",
    }).returning();
    return NextResponse.json({ id: season.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Season name already exists" }, { status: 409 });
  }
}
