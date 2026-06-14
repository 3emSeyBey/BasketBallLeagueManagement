import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";
import { db } from "@/db/client";
import { teams, matches, divisions } from "@/db/schema";
import { computeStandings } from "@/lib/standings";
import { StandingsTable } from "@/components/standings/StandingsTable";

export const dynamic = "force-dynamic";

export default async function PublicStandings() {
  const [allTeams, allMatches, allDivisions] = await Promise.all([
    db.select().from(teams),
    db.select().from(matches),
    db.select().from(divisions).orderBy(divisions.name),
  ]);
  const divisionName = new Map(allDivisions.map((d) => [d.id, d.name]));
  const teamsWithDivision = allTeams.map((t) => ({
    id: t.id,
    name: t.name,
    division: divisionName.get(t.divisionId) ?? "",
  }));
  const rows = computeStandings(teamsWithDivision, allMatches);
  const divisionNames = Array.from(new Set(allDivisions.map((d) => d.name)));
  const known = new Set(divisionNames);
  const orphaned = Array.from(
    new Set(rows.map((r) => r.division).filter((d) => !known.has(d))),
  ).sort();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Standings</h1>

      <Link
        href="/public/schedule"
        className="group block rounded-xl ring-1 ring-primary/30 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-5 hover:ring-primary/60 transition-colors"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid size-10 place-items-center rounded-lg bg-primary/20 text-primary ring-1 ring-primary/30">
              <Trophy className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold">View Bracketing</p>
              <p className="text-xs text-muted-foreground">
                See the full season bracket on the schedule page
              </p>
            </div>
          </div>
          <ChevronRight className="size-5 text-primary transition-transform group-hover:translate-x-0.5" />
        </div>
      </Link>

      {divisionNames.length === 0 ? (
        <p className="text-sm text-muted-foreground">No divisions yet.</p>
      ) : (
        divisionNames.map((name) => (
          <StandingsTable
            key={name}
            title={name}
            rows={rows.filter((r) => r.division === name)}
          />
        ))
      )}
      {orphaned.map((name) => (
        <StandingsTable
          key={`orphan-${name}`}
          title={`${name} (unlinked)`}
          rows={rows.filter((r) => r.division === name)}
        />
      ))}
    </div>
  );
}
