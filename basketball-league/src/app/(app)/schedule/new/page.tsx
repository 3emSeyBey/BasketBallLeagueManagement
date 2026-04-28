import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { teams, seasons } from "@/db/schema";
import { getSession } from "@/lib/session";
import { MatchForm } from "@/components/schedule/MatchForm";

export default async function NewMatchPage() {
  const s = await getSession();
  if (s?.role !== "admin") redirect("/schedule");
  const [allTeams, seasonRows] = await Promise.all([
    db.select().from(teams).orderBy(teams.name),
    db.select().from(seasons).limit(1),
  ]);
  const season = seasonRows[0];
  if (!season) redirect("/schedule");
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Create Match</h1>
      <MatchForm teams={allTeams} seasonId={season.id} />
    </div>
  );
}
