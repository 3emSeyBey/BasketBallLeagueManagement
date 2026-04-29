import Link from "next/link";
import { getSession } from "@/lib/session";
import { listAnnouncements } from "@/lib/announcements-query";
import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AnnouncementsListPage() {
  const session = (await getSession())!;
  const rows = await listAnnouncements(50);
  const canPost = session.role === "admin" || session.role === "team_manager";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Announcements</h1>
        {canPost && (
          <Link href="/announcements/new">
            <Button>New announcement</Button>
          </Link>
        )}
      </div>
      {rows.length === 0
        ? <p className="text-sm text-muted-foreground">No announcements yet.</p>
        : <div className="grid gap-4 sm:grid-cols-2">
            {rows.map(a => (
              <AnnouncementCard key={a.id} announcement={a} linkBase="/announcements" />
            ))}
          </div>}
    </div>
  );
}
