import { describe, it, expect } from "vitest";
import { users } from "@/db/schema";
import { logAudit, listAuditLog, loginCountsByUser } from "@/lib/audit";
import { makeTestDb } from "./helpers/test-db";

async function makeUser(db: Awaited<ReturnType<typeof makeTestDb>>, email: string, name: string) {
  const [u] = await db.insert(users).values({ email, name, passwordHash: "h", role: "admin" }).returning();
  return u;
}

describe("logAudit", () => {
  it("resolves actorLabel from the user row when not given", async () => {
    const db = await makeTestDb();
    const admin = await makeUser(db, "a@x.test", "Ada");

    await logAudit(db, { actorId: admin.id, action: "user.create", targetType: "user", targetId: 99 });

    const { rows } = await listAuditLog(db, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].actorLabel).toBe("Ada");
    expect(rows[0].outcome).toBe("success");
  });

  it("uses the given actorLabel and outcome without a lookup", async () => {
    const db = await makeTestDb();

    await logAudit(db, { actorId: null, actorLabel: "nobody@x.test", action: "auth.login", outcome: "failure" });

    const { rows } = await listAuditLog(db, 1);
    expect(rows[0].actorLabel).toBe("nobody@x.test");
    expect(rows[0].outcome).toBe("failure");
  });
});

describe("loginCountsByUser", () => {
  it("counts only successful logins, grouped by actor", async () => {
    const db = await makeTestDb();
    const alice = await makeUser(db, "alice@x.test", "Alice");
    const bob = await makeUser(db, "bob@x.test", "Bob");

    await logAudit(db, { actorId: alice.id, actorLabel: "Alice", action: "auth.login", outcome: "success" });
    await logAudit(db, { actorId: alice.id, actorLabel: "Alice", action: "auth.login", outcome: "success" });
    await logAudit(db, { actorId: alice.id, actorLabel: "Alice", action: "auth.login", outcome: "failure" });
    await logAudit(db, { actorId: bob.id, actorLabel: "Bob", action: "auth.login", outcome: "success" });

    const counts = await loginCountsByUser(db);
    const byLabel = Object.fromEntries(counts.map((c) => [c.actorLabel, c.count]));
    expect(byLabel["Alice"]).toBe(2);
    expect(byLabel["Bob"]).toBe(1);
  });
});
