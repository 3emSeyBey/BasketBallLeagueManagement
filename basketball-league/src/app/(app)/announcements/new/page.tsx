import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AnnouncementForm } from "@/components/announcements/AnnouncementForm";

export const dynamic = "force-dynamic";

export default async function NewAnnouncementPage() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "team_manager")) {
    redirect("/announcements");
  }
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-3xl font-semibold">New announcement</h1>
      <AnnouncementForm mode="create" />
    </div>
  );
}
