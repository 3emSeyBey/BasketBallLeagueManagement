import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { announcementImages } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await getSession();
  try { requireRole(session, "admin", "team_manager"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid form data" }, { status: 400 }); }

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (!ALLOWED_MIME.has(file.type)) return NextResponse.json({ error: "Unsupported type" }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Too large" }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());

  const [row] = await db.insert(announcementImages).values({
    announcementId: null,
    mimeType: file.type,
    data: buf,
    createdBy: session!.userId,
  }).returning({ id: announcementImages.id });

  return NextResponse.json({ id: row.id, url: `/api/announcements/images/${row.id}` }, { status: 201 });
}
