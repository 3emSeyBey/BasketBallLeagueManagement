import { listAnnouncements } from "@/lib/announcements-query";
import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";

export const dynamic = "force-dynamic";

export default async function PublicAnnouncementsPage() {
  const rows = await listAnnouncements(50);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Announcements</h1>
      {rows.length === 0
        ? <p className="text-sm text-muted-foreground">No announcements yet.</p>
        : <div className="grid gap-4 sm:grid-cols-2">
            {rows.map(a => (
              <AnnouncementCard key={a.id} announcement={a} linkBase="/public/announcements" />
            ))}
          </div>}
    </div>
  );
}
