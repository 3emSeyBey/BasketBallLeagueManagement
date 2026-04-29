import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnnouncement } from "@/lib/announcements-query";
import { AnnouncementBody } from "@/components/announcements/AnnouncementBody";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function PublicAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) notFound();

  const row = await getAnnouncement(idNum);
  if (!row) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/public/announcements" className="text-sm text-primary hover:underline">← All announcements</Link>
      <Card className="p-6 space-y-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold leading-tight">{row.title}</h1>
          <p className="text-xs text-muted-foreground">
            {row.authorEmail ?? "Unknown"} · {new Date(row.createdAt).toLocaleString()}
          </p>
        </div>
        <AnnouncementBody html={row.body} />
      </Card>
    </div>
  );
}
