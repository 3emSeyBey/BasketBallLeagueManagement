import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { desc, eq, inArray, and, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { announcements, announcementImages, users } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";
import { sanitizeBody, parseImageIds } from "@/lib/announcements";

const Create = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(50000),
});

export async function GET(req: NextRequest) {
  const limitParam = req.nextUrl.searchParams.get("limit");
  const parsed = limitParam ? Number(limitParam) : 20;
  const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 50) : 20;

  const rows = await db
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

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await getSession();
  try { requireRole(session, "admin", "team_manager"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const parsed = Create.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const cleanBody = sanitizeBody(parsed.data.body);
  if (cleanBody.length === 0) return NextResponse.json({ error: "Body empty after sanitize" }, { status: 400 });

  const [row] = await db.insert(announcements).values({
    title: parsed.data.title,
    body: cleanBody,
    createdBy: session!.userId,
  }).returning({ id: announcements.id });

  const imageIds = parseImageIds(cleanBody);
  if (imageIds.length > 0) {
    await db.update(announcementImages)
      .set({ announcementId: row.id })
      .where(and(
        inArray(announcementImages.id, imageIds),
        eq(announcementImages.createdBy, session!.userId),
        isNull(announcementImages.announcementId),
      ));
  }

  return NextResponse.json({ id: row.id }, { status: 201 });
}
