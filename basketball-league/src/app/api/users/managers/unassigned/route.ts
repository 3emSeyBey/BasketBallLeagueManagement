import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

export async function GET() {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      name: users.name,
    })
    .from(users)
    .where(and(eq(users.role, "team_manager"), isNull(users.teamId)));

  return NextResponse.json(rows);
}
