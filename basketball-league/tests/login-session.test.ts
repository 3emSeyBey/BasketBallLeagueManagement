import { describe, it, expect, beforeAll, vi } from "vitest";
import { eq } from "drizzle-orm";

vi.mock("@/db/client", async () => {
  const { makeTestDb } = await import("./helpers/test-db");
  return { db: await makeTestDb() };
});
// Every request comes from a fresh browser with no session cookie.
vi.mock("@/lib/session", () => ({ SESSION_COOKIE: "league_session", getSession: async () => null }));

import { POST } from "@/app/api/auth/login/route";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";

beforeAll(async () => {
  process.env.JWT_SECRET = "0".repeat(64);
  await db.insert(users).values({ email: "a@x.com", passwordHash: await hashPassword("pw"), role: "admin" });
});

const login = (force?: boolean) =>
  POST(new Request("http://x/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier: "a@x.com", password: "pw", force }),
  }));
const version = async () =>
  (await db.query.users.findFirst({ where: eq(users.email, "a@x.com") }))!.sessionVersion;

describe("login while the account is in use elsewhere", () => {
  it("warns without logging in, then force takes over and revokes the other session", async () => {
    expect((await login()).status).toBe(200);

    const warned = await login();
    expect(warned.status).toBe(409);
    expect(warned.headers.get("set-cookie")).toBeNull();

    const before = await version();
    const forced = await login(true);
    expect(forced.status).toBe(200);
    expect(await version()).toBe(before + 1);
  });
});
