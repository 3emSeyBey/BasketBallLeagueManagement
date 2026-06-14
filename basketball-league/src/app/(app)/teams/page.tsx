import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { teams, divisions } from "@/db/schema";
import { AddDivisionDialog } from "@/components/divisions/AddDivisionDialog";
import { TeamsByDivision, type DivisionGroup } from "@/components/teams/TeamsByDivision";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const session = (await getSession())!;
  const isAdmin = session.role === "admin";

  const [allTeams, divs] = await Promise.all([
    db.select().from(teams).orderBy(asc(teams.name)),
    db.select().from(divisions).orderBy(asc(divisions.name)),
  ]);

  const divNameById = new Map(divs.map((d) => [d.id, d.name]));

  // One group per division (deduped by name), each holding its serializable teams.
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">League Teams</h1>
          <p className="text-muted-foreground">
            {allTeams.length} teams across {divs.length} division
            {divs.length === 1 ? "" : "s"}
            {isAdmin && (
              <>
                {" "}
                · <span className="text-xs">Double-click a division name to rename</span>
              </>
            )}
          </p>
        </div>
        {isAdmin && <AddDivisionDialog />}
      </div>

      <TeamsByDivision groups={groups} isAdmin={isAdmin} />
    </div>
  );
}
