import type { SessionPayload } from "./auth";

export type Role = SessionPayload["role"];

export class ForbiddenError extends Error {
  constructor() { super("Forbidden"); }
}

export function requireRole(session: SessionPayload | null, ...roles: Role[]): SessionPayload {
  if (!session) throw new ForbiddenError();
  if (!roles.includes(session.role)) throw new ForbiddenError();
  return session;
}

export function canManageTeam(session: SessionPayload | null, teamId: number): boolean {
  if (!session) return false;
  if (session.role === "admin") return true;
  return session.role === "team_manager" && session.teamId === teamId;
}
