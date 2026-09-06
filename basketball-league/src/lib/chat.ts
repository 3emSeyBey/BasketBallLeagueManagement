import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { and, asc, desc, eq, gt } from "drizzle-orm";
import * as schema from "@/db/schema";
import { chatMessages, type ChatMessage } from "@/db/schema";

type Database = LibSQLDatabase<typeof schema>;

export const MAX_BODY_LEN = 500;
export const MAX_LABEL_LEN = 40;
export const RATE_LIMIT_MS = 3000;
export const PAGE_LIMIT = 100;

export class ChatError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// SQLite's CURRENT_TIMESTAMP renders as "YYYY-MM-DD HH:MM:SS" (UTC, no zone
// marker) — plain `new Date(...)` on that string parses it as local time.
function parseSqliteUtc(s: string): number {
  return new Date(s.replace(" ", "T") + "Z").getTime();
}

export async function listMessages(
  db: Database,
  matchId: number,
  sinceId = 0,
): Promise<ChatMessage[]> {
  return db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.matchId, matchId), gt(chatMessages.id, sinceId)))
    .orderBy(asc(chatMessages.id))
    .limit(PAGE_LIMIT);
}

export type PostMessageInput = {
  matchId: number;
  senderKey: string;
  senderId: number | null;
  senderLabel: string;
  body: string;
};

// Throws ChatError(400) on bad input, ChatError(429) on rate limit.
export async function postMessage(db: Database, input: PostMessageInput): Promise<ChatMessage> {
  const body = input.body.trim();
  if (!body) throw new ChatError(400, "Message can't be empty");
  if (body.length > MAX_BODY_LEN) throw new ChatError(400, `Message too long (max ${MAX_BODY_LEN} characters)`);

  const senderLabel = input.senderLabel.trim();
  if (!senderLabel) throw new ChatError(400, "Display name required");
  if (senderLabel.length > MAX_LABEL_LEN) throw new ChatError(400, `Name too long (max ${MAX_LABEL_LEN} characters)`);

  if (!input.senderKey.trim()) throw new ChatError(400, "Missing sender key");

  const last = await db.query.chatMessages.findFirst({
    where: and(eq(chatMessages.matchId, input.matchId), eq(chatMessages.senderKey, input.senderKey)),
    orderBy: desc(chatMessages.id),
  });
  if (last && Date.now() - parseSqliteUtc(last.createdAt) < RATE_LIMIT_MS) {
    throw new ChatError(429, "You're sending messages too fast — wait a moment");
  }

  const [row] = await db
    .insert(chatMessages)
    .values({
      matchId: input.matchId,
      senderKey: input.senderKey,
      senderId: input.senderId,
      senderLabel,
      body,
    })
    .returning();
  return row;
}
