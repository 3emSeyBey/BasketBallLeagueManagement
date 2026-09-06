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
    const token = await signSession({ userId: 1, role: "admin", teamId: null, sessionVersion: 0 });
    const payload = await verifySession(token);
    expect(payload.userId).toBe(1);
    expect(payload.role).toBe("admin");
  });

  it("rejects tampered token", async () => {
    const token = await signSession({ userId: 1, role: "admin", teamId: null, sessionVersion: 0 });
    await expect(verifySession(token + "x")).rejects.toThrow();
  });

  it("round-trips a non-zero sessionVersion", async () => {
    const token = await signSession({ userId: 1, role: "admin", teamId: null, sessionVersion: 3 });
    const payload = await verifySession(token);
    expect(payload.sessionVersion).toBe(3);
  });

  it("defaults sessionVersion to 0 for a token signed before this claim existed", async () => {
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode("0".repeat(64));
    const legacyToken = await new SignJWT({ userId: 1, role: "admin", teamId: null })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);
    const payload = await verifySession(legacyToken);
    expect(payload.sessionVersion).toBe(0);
  });
});
