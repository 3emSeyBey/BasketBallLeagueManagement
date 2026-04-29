import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { announcements, announcementImages, users } from "@/db/schema";
import { getSession } from "@/lib/session";
import { sanitizeBody, parseImageIds } from "@/lib/announcements";

const Update = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(50000).optional(),
});

async function loadAnnouncement(id: number) {
  return db.query.announcements.findFirst({ where: eq(announcements.id, id) });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

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
    .where(eq(announcements.id, idNum));

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const existing = await loadAnnouncement(idNum);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAuthor = existing.createdBy === session.userId;
  const isAdmin = session.role === "admin";
  if (!isAuthor && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = Update.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const patch: { title?: string; body?: string; updatedAt: ReturnType<typeof sql> } = {
    updatedAt: sql`(CURRENT_TIMESTAMP)`,
  };
  let cleanBody: string | null = null;
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.body !== undefined) {
    cleanBody = sanitizeBody(parsed.data.body);
    if (cleanBody.length === 0) return NextResponse.json({ error: "Body empty after sanitize" }, { status: 400 });
    patch.body = cleanBody;
  }

  await db.update(announcements).set(patch).where(eq(announcements.id, idNum));

  if (cleanBody !== null) {
    const imageIds = parseImageIds(cleanBody);
    if (imageIds.length > 0) {
      await db.update(announcementImages)
        .set({ announcementId: idNum })
        .where(and(
          inArray(announcementImages.id, imageIds),
          eq(announcementImages.createdBy, session.userId),
          isNull(announcementImages.announcementId),
        ));
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const existing = await loadAnnouncement(idNum);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAuthor = existing.createdBy === session.userId;
  const isAdmin = session.role === "admin";
  if (!isAuthor && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.delete(announcements).where(eq(announcements.id, idNum));
  return NextResponse.json({ ok: true });
}
