import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { announcements, users } from "@/db/schema";

export async function listAnnouncements(limit = 20) {
  return db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      createdBy: announcements.createdBy,
      createdAt: announcements.createdAt,
      updatedAt: announcements.updatedAt,
      authorEmail: users.email,
    })
    .from(announcements)
    .leftJoin(users, eq(users.id, announcements.createdBy))
    .orderBy(desc(announcements.createdAt))
    .limit(limit);
}

export async function getAnnouncement(id: number) {
  const [row] = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      createdBy: announcements.createdBy,
      createdAt: announcements.createdAt,
      updatedAt: announcements.updatedAt,
      authorEmail: users.email,
    })
    .from(announcements)
    .leftJoin(users, eq(users.id, announcements.createdBy))
    .where(eq(announcements.id, id));
  return row ?? null;
}
