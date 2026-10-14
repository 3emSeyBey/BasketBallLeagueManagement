import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { eq } from "drizzle-orm";

vi.mock("@/db/client", async () => {
  const { makeTestDb } = await import("./helpers/test-db");
  return { db: await makeTestDb() };
});
vi.mock("@/lib/session", () => ({ SESSION_COOKIE: "league_session", getSession: async () => null }));

import { POST } from "@/app/api/auth/login/route";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";

beforeAll(async () => {
  process.env.JWT_SECRET = "0".repeat(64);
  await db.insert(users).values([
    { email: "lock@x.com", passwordHash: await hashPassword("pw"), role: "admin" },
    { email: "reset@x.com", passwordHash: await hashPassword("pw"), role: "admin" },
  ]);
});
afterEach(() => vi.useRealTimers());

const login = (identifier: string, password: string) =>
  POST(new Request("http://x/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  }));
const row = async (email: string) => (await db.query.users.findFirst({ where: eq(users.email, email) }))!;

describe("login lockout", () => {
  it("locks for 15 minutes after 5 wrong passwords, refusing even the right one", async () => {
    for (let i = 0; i < 4; i++) expect((await login("lock@x.com", "bad")).status).toBe(401);

    const fifth = await login("lock@x.com", "bad");
    expect(fifth.status).toBe(429);
    expect((await fifth.json()).code).toBe("LOCKED");

    const correct = await login("lock@x.com", "pw");
    expect(correct.status).toBe(429);
    expect(correct.headers.get("set-cookie")).toBeNull();

    const lockedUntil = (await row("lock@x.com")).lockedUntil!;
    expect(lockedUntil - Date.now()).toBeGreaterThan(14 * 60 * 1000);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(lockedUntil + 1);
    expect((await login("lock@x.com", "pw")).status).toBe(200);
    const after = await row("lock@x.com");
    expect(after.lockedUntil).toBeNull();
    expect(after.failedLoginAttempts).toBe(0);
  });

  it("resets the counter on a successful login", async () => {
    for (let i = 0; i < 4; i++) await login("reset@x.com", "bad");
    expect((await login("reset@x.com", "pw")).status).toBe(200);
    expect((await row("reset@x.com")).failedLoginAttempts).toBe(0);
  });
});
