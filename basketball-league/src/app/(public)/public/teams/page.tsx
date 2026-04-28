import { db } from "@/db/client";
import { teams } from "@/db/schema";
import { TeamCard } from "@/components/teams/TeamCard";

export default async function PublicTeams() {
  const all = await db.select().from(teams).orderBy(teams.name);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Teams</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {all.map((t) => (
          <TeamCard key={t.id} team={t} linkPrefix="/public/teams" />
        ))}
      </div>
    </div>
  );
}
