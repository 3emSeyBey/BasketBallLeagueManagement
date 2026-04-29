import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAnnouncement } from "@/lib/announcements-query";
import { AnnouncementForm } from "@/components/announcements/AnnouncementForm";

export const dynamic = "force-dynamic";

export default async function EditAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) notFound();

  const session = await getSession();
  if (!session) redirect("/login");

  const row = await getAnnouncement(idNum);
  if (!row) notFound();

  const canEdit = session.role === "admin" || session.userId === row.createdBy;
  if (!canEdit) redirect(`/announcements/${idNum}`);

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-3xl font-semibold">Edit announcement</h1>
      <AnnouncementForm
        mode="edit"
        announcementId={row.id}
        initialTitle={row.title}
        initialBody={row.body}
      />
    </div>
  );
}
