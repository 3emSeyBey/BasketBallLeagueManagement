import { describe, it, expect } from "vitest";
import { seasons, matches, chatMessages } from "@/db/schema";
import { listMessages, postMessage, ChatError, MAX_BODY_LEN, MAX_LABEL_LEN } from "@/lib/chat";
import { makeTestDb } from "./helpers/test-db";

let seasonCounter = 0;

async function makeMatch(db: Awaited<ReturnType<typeof makeTestDb>>) {
  const [season] = await db.insert(seasons).values({
    name: `S${++seasonCounter}`, startedAt: "2026-01-01T00:00:00.000Z",
  }).returning();
  const [match] = await db.insert(matches).values({ seasonId: season.id, status: "live" }).returning();
  return match;
}

describe("postMessage", () => {
  it("inserts a message and echoes it back", async () => {
    const db = await makeTestDb();
    const match = await makeMatch(db);

    const row = await postMessage(db, {
      matchId: match.id, senderId: null, senderKey: "guest:abc", senderLabel: "Alice", body: "hi",
    });

    expect(row.body).toBe("hi");
    expect(row.senderLabel).toBe("Alice");
    expect(row.senderId).toBeNull();
  });

  it("rejects an empty body", async () => {
    const db = await makeTestDb();
    const match = await makeMatch(db);
    await expect(
      postMessage(db, { matchId: match.id, senderId: null, senderKey: "guest:a", senderLabel: "A", body: "   " }),
    ).rejects.toThrow(ChatError);
  });

  it("rejects a body over the length cap", async () => {
    const db = await makeTestDb();
    const match = await makeMatch(db);
    await expect(
      postMessage(db, {
        matchId: match.id, senderId: null, senderKey: "guest:a", senderLabel: "A",
        body: "x".repeat(MAX_BODY_LEN + 1),
      }),
    ).rejects.toThrow(ChatError);
  });

  it("rejects a display name over the length cap", async () => {
    const db = await makeTestDb();
    const match = await makeMatch(db);
    await expect(
      postMessage(db, {
        matchId: match.id, senderId: null, senderKey: "guest:a",
        senderLabel: "x".repeat(MAX_LABEL_LEN + 1), body: "hi",
      }),
    ).rejects.toThrow(ChatError);
  });

  it("rate-limits a second message from the same sender within the window", async () => {
    const db = await makeTestDb();
    const match = await makeMatch(db);
    await postMessage(db, { matchId: match.id, senderId: null, senderKey: "guest:a", senderLabel: "A", body: "one" });

    await expect(
      postMessage(db, { matchId: match.id, senderId: null, senderKey: "guest:a", senderLabel: "A", body: "two" }),
    ).rejects.toMatchObject({ status: 429 });
  });

  it("does not rate-limit a different sender", async () => {
    const db = await makeTestDb();
    const match = await makeMatch(db);
    await postMessage(db, { matchId: match.id, senderId: null, senderKey: "guest:a", senderLabel: "A", body: "one" });

    const row = await postMessage(db, {
      matchId: match.id, senderId: null, senderKey: "guest:b", senderLabel: "B", body: "two",
    });
    expect(row.body).toBe("two");
  });

  it("allows a new message once the rate-limit window has passed", async () => {
    const db = await makeTestDb();
    const match = await makeMatch(db);
    const old = new Date(Date.now() - 10_000).toISOString().replace("T", " ").slice(0, 19);
    await db.insert(chatMessages).values({
      matchId: match.id, senderKey: "guest:a", senderId: null, senderLabel: "A", body: "old", createdAt: old,
    });

    const row = await postMessage(db, {
      matchId: match.id, senderId: null, senderKey: "guest:a", senderLabel: "A", body: "new",
    });
    expect(row.body).toBe("new");
  });
});

describe("listMessages", () => {
  it("orders ascending and scopes to the given match", async () => {
    const db = await makeTestDb();
    const m1 = await makeMatch(db);
    const m2 = await makeMatch(db);
    await postMessage(db, { matchId: m1.id, senderId: null, senderKey: "guest:a", senderLabel: "A", body: "m1-1" });
    await postMessage(db, { matchId: m2.id, senderId: null, senderKey: "guest:b", senderLabel: "B", body: "m2-1" });
    await postMessage(db, { matchId: m1.id, senderId: null, senderKey: "guest:c", senderLabel: "C", body: "m1-2" });

    const rows = await listMessages(db, m1.id);
    expect(rows.map((r) => r.body)).toEqual(["m1-1", "m1-2"]);
  });

  it("returns only messages after sinceId", async () => {
    const db = await makeTestDb();
    const match = await makeMatch(db);
    const first = await postMessage(db, { matchId: match.id, senderId: null, senderKey: "guest:a", senderLabel: "A", body: "1" });
    await postMessage(db, { matchId: match.id, senderId: null, senderKey: "guest:b", senderLabel: "B", body: "2" });

    const rows = await listMessages(db, match.id, first.id);
    expect(rows.map((r) => r.body)).toEqual(["2"]);
  });
});
