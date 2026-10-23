import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { teams } from "@/db/schema";
import { currentSeasonDivisions } from "@/lib/season-service";
import { TeamsByDivision, type DivisionGroup } from "@/components/teams/TeamsByDivision";

export const dynamic = "force-dynamic";

export default async function PublicTeams() {
  const [everyTeam, divs] = await Promise.all([
    db.select().from(teams).orderBy(asc(teams.name)),
    currentSeasonDivisions(db),
  ]);

  const divNameById = new Map(divs.map((d) => [d.id, d.name]));
  const allTeams = everyTeam.filter((t) => divNameById.has(t.divisionId));

  const groupByName = new Map<string, DivisionGroup>();
  for (const d of divs) {
    if (!groupByName.has(d.name)) groupByName.set(d.name, { divId: d.id, divName: d.name, teams: [] });
  }
  for (const t of allTeams) {
    const divName = divNameById.get(t.divisionId) ?? "Unassigned";
    if (!groupByName.has(divName)) groupByName.set(divName, { divId: null, divName, teams: [] });
    groupByName.get(divName)!.teams.push({
      id: t.id,
      name: t.name,
      division: divName,
      imageMimeType: t.imageMimeType,
      createdAt: t.createdAt,
    });
  }
  const groups = Array.from(groupByName.values());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">League Teams</h1>
        <p className="text-muted-foreground">
          {allTeams.length} teams across {divs.length} division
          {divs.length === 1 ? "" : "s"}
        </p>
      </div>

      <TeamsByDivision groups={groups} isAdmin={false} linkPrefix="/public/teams" />
    </div>
  );
}
