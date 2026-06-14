import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db/client";
import { users, teams, divisions } from "@/db/schema";
import { hashPassword, signSession } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session";

const Account = {
  email: z.string().email(),
  username: z.string().min(3).max(40)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username may only contain letters, numbers, dot, underscore, dash"),
  name: z.string().min(1).max(120),
  contactNumber: z.string().min(7).max(40).optional(),
  password: z.string().min(6),
};

const Body = z.discriminatedUnion("teamMode", [
  z.object({ ...Account, teamMode: z.literal("create"), teamName: z.string().trim().min(2).max(80), divisionId: z.number().int().positive() }),
  z.object({ ...Account, teamMode: z.literal("existing"), teamId: z.number().int().positive() }),
]);

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const existing = await db.query.users.findFirst({
    where: or(eq(users.email, data.email), eq(users.username, data.username)),
  });
  if (existing) return NextResponse.json({ error: "Email or username already exists" }, { status: 409 });

  // Validate the requested team. Nothing is materialized until an admin approves.
  let requestedTeamName: string | null = null;
  let requestedDivisionId: number | null = null;
  let requestedTeamId: number | null = null;

  if (data.teamMode === "create") {
    const div = await db.query.divisions.findFirst({ where: eq(divisions.id, data.divisionId) });
    if (!div) return NextResponse.json({ error: "Unknown division" }, { status: 400 });
    const dupTeam = await db.query.teams.findFirst({ where: eq(teams.name, data.teamName) });
    if (dupTeam) return NextResponse.json({ error: "A team with that name already exists" }, { status: 409 });
    const dupRequest = await db.query.users.findFirst({ where: eq(users.requestedTeamName, data.teamName) });
    if (dupRequest) return NextResponse.json({ error: "Someone has already requested that team name" }, { status: 409 });
    requestedTeamName = data.teamName;
    requestedDivisionId = data.divisionId;
  } else {
    const team = await db.query.teams.findFirst({ where: eq(teams.id, data.teamId) });
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
    const taken = await db.query.users.findFirst({ where: eq(users.teamId, data.teamId) });
    if (taken) return NextResponse.json({ error: "That team already has a manager" }, { status: 409 });
    const requested = await db.query.users.findFirst({
      where: and(eq(users.requestedTeamId, data.teamId), eq(users.status, "pending")),
    });
    if (requested) return NextResponse.json({ error: "That team is already requested by another applicant" }, { status: 409 });
    requestedTeamId = data.teamId;
  }

  const passwordHash = await hashPassword(data.password);

  let userRow: { id: number };
  try {
    const [u] = await db.insert(users).values({
      email: data.email,
      username: data.username,
      name: data.name,
      contactNumber: data.contactNumber ?? null,
      passwordHash,
      role: "team_manager",
      status: "pending",
      teamId: null,
      requestedTeamName,
      requestedDivisionId,
      requestedTeamId,
    }).returning({ id: users.id });
    userRow = u;
  } catch {
    return NextResponse.json({ error: "Could not complete registration. The account may already exist." }, { status: 409 });
  }

  // Auto-login: the manager lands on the dashboard in a pending state, no team yet.
  const token = await signSession({ userId: userRow.id, role: "team_manager", teamId: null, status: "pending" });
  const res = NextResponse.json({ id: userRow.id, status: "pending" }, { status: 201 });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
