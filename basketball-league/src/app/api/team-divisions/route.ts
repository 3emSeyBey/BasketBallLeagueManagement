import { NextResponse } from "next/server";
import { z } from "zod";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { teamDivisions } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

const Create = z.object({
  name: z.string().trim().min(1).max(60),
});

export async function GET() {
  const rows = await db
    .select()
    .from(teamDivisions)
    .orderBy(asc(teamDivisions.name));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  try {
    requireRole(await getSession(), "admin");
  } catch (e) {
    if (e instanceof ForbiddenError)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw e;
  }
  const parsed = Create.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const [row] = await db
      .insert(teamDivisions)
      .values({ name: parsed.data.name })
      .returning();
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Insert failed";
    if (msg.includes("UNIQUE"))
      return NextResponse.json(
        { error: "Division already exists" },
        { status: 409 },
      );
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
