import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { teams } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const MAX_BYTES = 5 * 1024 * 1024;

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) return new Response("Bad id", { status: 400 });
  const row = await db
    .select({
      imageMimeType: teams.imageMimeType,
      imageData: teams.imageData,
    })
    .from(teams)
    .where(eq(teams.id, idNum))
    .then((r) => r[0]);
  if (!row || !row.imageData || !row.imageMimeType)
    return new Response("Not found", { status: 404 });
  const data = row.imageData as Buffer;
  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": row.imageMimeType,
      "Content-Length": String(data.length),
      "Cache-Control": "public, max-age=300",
    },
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireRole(await getSession(), "admin");
  } catch (e) {
    if (e instanceof ForbiddenError)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw e;
  }
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum))
    return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const team = await db.query.teams.findFirst({ where: eq(teams.id, idNum) });
  if (!team)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (!ALLOWED_MIME.has(file.type))
    return NextResponse.json({ error: "Unsupported type" }, { status: 415 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "Too large" }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  await db
    .update(teams)
    .set({ imageMimeType: file.type, imageData: buf })
    .where(eq(teams.id, idNum));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireRole(await getSession(), "admin");
  } catch (e) {
    if (e instanceof ForbiddenError)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw e;
  }
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum))
    return NextResponse.json({ error: "Bad id" }, { status: 400 });

  await db
    .update(teams)
    .set({ imageMimeType: null, imageData: null })
    .where(eq(teams.id, idNum));
  return NextResponse.json({ ok: true });
}
