import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { desc, eq, and, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import { auditLog, users } from "@/db/schema";

type Database = LibSQLDatabase<typeof schema>;

export type AuditEvent = {
  actorId: number | null;
  // Omit to have logAudit look the actor's name/email up (one extra query) —
  // pass it explicitly when the caller already has the user row in hand.
  actorLabel?: string;
  action: string;
  outcome?: "success" | "failure";
  targetType?: string;
  targetId?: number;
  meta?: Record<string, unknown>;
};

// Never throws: a logging failure must not take down the request whose real
// action already succeeded.
export async function logAudit(db: Database, e: AuditEvent): Promise<void> {
  try {
    let actorLabel = e.actorLabel;
    if (actorLabel === undefined) {
      const actor = e.actorId !== null
        ? await db.query.users.findFirst({ where: eq(users.id, e.actorId) })
        : null;
      actorLabel = actor?.name || actor?.email || (e.actorId !== null ? `user #${e.actorId}` : "unknown");
    }
    await db.insert(auditLog).values({
      actorId: e.actorId,
      actorLabel,
      action: e.action,
      outcome: e.outcome ?? "success",
      targetType: e.targetType ?? null,
      targetId: e.targetId ?? null,
      meta: e.meta ? JSON.stringify(e.meta) : null,
    });
  } catch (err) {
    console.error("logAudit failed", e.action, err);
  }
}

const PAGE_SIZE = 50;

export async function listAuditLog(db: Database, page: number) {
  const offset = Math.max(page - 1, 0) * PAGE_SIZE;
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(auditLog).orderBy(desc(auditLog.id)).limit(PAGE_SIZE).offset(offset),
    db.select({ total: sql<number>`count(*)` }).from(auditLog),
  ]);
  return { rows, total, pageSize: PAGE_SIZE };
}

export async function loginCountsByUser(db: Database) {
  return db
    .select({
      actorId: auditLog.actorId,
      actorLabel: auditLog.actorLabel,
      count: sql<number>`count(*)`,
      lastLogin: sql<string>`max(${auditLog.createdAt})`,
    })
    .from(auditLog)
    .where(and(eq(auditLog.action, "auth.login"), eq(auditLog.outcome, "success")))
    .groupBy(auditLog.actorId, auditLog.actorLabel)
    .orderBy(desc(sql`count(*)`));
}
