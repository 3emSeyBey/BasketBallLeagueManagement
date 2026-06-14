import { NextResponse } from "next/server";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { brackets, divisions, seasons } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";
import { createBracket } from "@/lib/bracket-service";

const Create = z.object({
  divisionId: z.number().int().positive(),
  title: z.string().trim().min(1).max(120),
  isDefault: z.boolean().optional(),
});

// List every bracket with its division + season labels. Public callers see only
// published ones; admins see all.
export async function GET() {
  const session = await getSession();
  const isAdmin = session?.role === "admin";

  const rows = await db
    .select({
      id: brackets.id,
      title: brackets.title,
      isDefault: brackets.isDefault,
      isPublished: brackets.isPublished,
      createdAt: brackets.createdAt,
      divisionId: brackets.divisionId,
      divisionName: divisions.name,
      seasonId: divisions.seasonId,
      seasonName: seasons.name,
    })
    .from(brackets)
    .innerJoin(divisions, eq(divisions.id, brackets.divisionId))
    .innerJoin(seasons, eq(seasons.id, divisions.seasonId))
    .orderBy(asc(seasons.id), asc(divisions.name), asc(brackets.id));

  return NextResponse.json(isAdmin ? rows : rows.filter((r) => r.isPublished));
}

export async function POST(req: Request) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const parsed = Create.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const div = await db.query.divisions.findFirst({ where: eq(divisions.id, parsed.data.divisionId) });
  if (!div) return NextResponse.json({ error: "Unknown division" }, { status: 400 });

  const bracket = await createBracket(db, parsed.data);
  return NextResponse.json(bracket, { status: 201 });
}
