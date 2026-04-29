import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { announcementImages } from "@/db/schema";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) return new Response("Bad id", { status: 400 });

  const row = await db.query.announcementImages.findFirst({ where: eq(announcementImages.id, idNum) });
  if (!row) return new Response("Not found", { status: 404 });

  const data = row.data as Buffer;
  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": row.mimeType,
      "Content-Length": String(data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
