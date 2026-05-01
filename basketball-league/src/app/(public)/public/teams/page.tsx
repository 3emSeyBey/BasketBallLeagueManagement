import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { teams, teamDivisions } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { TeamCard } from "@/components/teams/TeamCard";

export const dynamic = "force-dynamic";

export default async function PublicTeams() {
  const [allTeams, divs] = await Promise.all([
    db.select().from(teams).orderBy(asc(teams.name)),
    db.select().from(teamDivisions).orderBy(asc(teamDivisions.name)),
  ]);

  const grouped = new Map<string, typeof allTeams>(
    divs.map((d) => [d.name, []]),
  );
  for (const t of allTeams) {
    if (!grouped.has(t.division)) grouped.set(t.division, []);
    grouped.get(t.division)!.push(t);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">League Teams</h1>
        <p className="text-muted-foreground">
          {allTeams.length} teams across {divs.length} division
          {divs.length === 1 ? "" : "s"}
        </p>
      </div>

      {grouped.size === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <p>No divisions yet.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([divName, list]) => (
            <Card key={divName} className="p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="size-2 rounded-full bg-primary shadow-[0_0_12px_rgba(243,112,33,0.7)]" />
                <h2 className="text-xl font-semibold tracking-tight">{divName}</h2>
                <span className="text-xs text-muted-foreground">
                  {list.length} team{list.length === 1 ? "" : "s"}
                </span>
              </div>
              {list.length === 0 ? (
                <p className="text-sm text-muted-foreground border border-dashed border-white/10 rounded-md p-4 text-center">
                  No teams in this division yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {list.map((t) => (
                    <TeamCard
                      key={t.id}
                      team={t}
                      linkPrefix="/public/teams"
                      showDivision={false}
                    />
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
