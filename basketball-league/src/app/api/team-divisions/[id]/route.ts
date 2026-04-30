import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { teamDivisions, teams } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

const Patch = z.object({
  name: z.string().trim().min(1).max(60),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireRole(await getSession(), "admin");
  } catch (e) {
    if (e instanceof ForbiddenError)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw e;
  }
  const { id } = await params;
  const parsed = Patch.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await db.query.teamDivisions.findFirst({
    where: eq(teamDivisions.id, Number(id)),
  });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.name === parsed.data.name)
    return NextResponse.json(existing);

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(teamDivisions)
        .set({ name: parsed.data.name })
        .where(eq(teamDivisions.id, existing.id));
      await tx
        .update(teams)
        .set({ division: parsed.data.name })
        .where(eq(teams.division, existing.name));
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Rename failed";
    if (msg.includes("UNIQUE"))
      return NextResponse.json(
        { error: "Division name already exists" },
        { status: 409 },
      );
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const [row] = await db
    .select()
    .from(teamDivisions)
    .where(eq(teamDivisions.id, existing.id));
  return NextResponse.json(row);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireRole(await getSession(), "admin");
  } catch (e) {
    if (e instanceof ForbiddenError)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw e;
  }
  const { id } = await params;
  const existing = await db.query.teamDivisions.findFirst({
    where: eq(teamDivisions.id, Number(id)),
  });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [hasTeams] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.division, existing.name))
    .limit(1);
  if (hasTeams)
    return NextResponse.json(
      { error: "Division has teams; reassign or delete them first" },
      { status: 400 },
    );
  await db.delete(teamDivisions).where(eq(teamDivisions.id, existing.id));
  return NextResponse.json({ ok: true });
}
