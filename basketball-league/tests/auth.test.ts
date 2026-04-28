import { describe, it, expect, beforeAll } from "vitest";
import { hashPassword, verifyPassword, signSession, verifySession } from "@/lib/auth";

beforeAll(() => { process.env.JWT_SECRET = "0".repeat(64); });

describe("auth", () => {
  it("hashes and verifies passwords", async () => {
    const h = await hashPassword("pw");
    expect(await verifyPassword("pw", h)).toBe(true);
    expect(await verifyPassword("nope", h)).toBe(false);
  });

  it("signs and verifies session JWT", async () => {
    const token = await signSession({ userId: 1, role: "admin", teamId: null });
    const payload = await verifySession(token);
    expect(payload.userId).toBe(1);
    expect(payload.role).toBe("admin");
  });

  it("rejects tampered token", async () => {
    const token = await signSession({ userId: 1, role: "admin", teamId: null });
    await expect(verifySession(token + "x")).rejects.toThrow();
  });
});
