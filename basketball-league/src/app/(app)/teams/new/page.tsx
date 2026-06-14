import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { TeamForm } from "@/components/teams/TeamForm";

export default async function NewTeamPage() {
  const s = await getSession();
  if (s?.role !== "admin") redirect("/teams");
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Register Team</h1>
      <TeamForm />
    </div>
  );
}
