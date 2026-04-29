import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAnnouncement } from "@/lib/announcements-query";
import { AnnouncementBody } from "@/components/announcements/AnnouncementBody";
import { DeleteAnnouncementButton } from "@/components/announcements/DeleteAnnouncementButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) notFound();

  const [session, row] = await Promise.all([getSession(), getAnnouncement(idNum)]);
  if (!row) notFound();

  const canEdit = !!session && (session.role === "admin" || session.userId === row.createdBy);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <Link href="/announcements" className="text-sm text-primary hover:underline">← All announcements</Link>
        {canEdit && (
          <div className="flex gap-2">
            <Link href={`/announcements/${row.id}/edit`}>
              <Button variant="outline" size="sm">Edit</Button>
            </Link>
            <DeleteAnnouncementButton id={row.id} />
          </div>
        )}
      </div>
      <Card className="p-6 space-y-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold leading-tight">{row.title}</h1>
          <p className="text-xs text-muted-foreground">
            {row.authorEmail ?? "Unknown"} · {new Date(row.createdAt).toLocaleString()}
            {row.updatedAt !== row.createdAt && <> · edited {new Date(row.updatedAt).toLocaleString()}</>}
          </p>
        </div>
        <AnnouncementBody html={row.body} />
      </Card>
    </div>
  );
}
