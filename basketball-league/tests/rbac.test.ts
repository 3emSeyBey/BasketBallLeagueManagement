import { describe, it, expect } from "vitest";
import { requireRole, canManageTeam, ForbiddenError } from "@/lib/rbac";

const admin = { userId: 1, role: "admin" as const, teamId: null };
const tm = { userId: 2, role: "team_manager" as const, teamId: 5 };

describe("rbac", () => {
  it("requireRole passes when role matches", () => {
    expect(requireRole(admin, "admin")).toBe(admin);
  });
  it("requireRole throws when null", () => {
    expect(() => requireRole(null, "admin")).toThrow(ForbiddenError);
  });
  it("requireRole throws when role mismatched", () => {
    expect(() => requireRole(tm, "admin")).toThrow(ForbiddenError);
  });
  it("canManageTeam: admin = always true", () => {
    expect(canManageTeam(admin, 99)).toBe(true);
  });
  it("canManageTeam: tm only own team", () => {
    expect(canManageTeam(tm, 5)).toBe(true);
    expect(canManageTeam(tm, 6)).toBe(false);
  });
  it("canManageTeam: no session = false", () => {
    expect(canManageTeam(null, 5)).toBe(false);
  });
});
