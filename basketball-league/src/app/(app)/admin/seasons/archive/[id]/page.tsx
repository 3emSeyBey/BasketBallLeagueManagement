import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { seasons, divisions, teams, players, matches, brackets } from "@/db/schema";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StandingsTable } from "@/components/standings/StandingsTable";
import { BracketGrid } from "@/components/brackets/BracketGrid";
import { computeStandings } from "@/lib/standings";
import { loadBracketTree } from "@/lib/bracket-service";

export const dynamic = "force-dynamic";

export default async function ArchivedSeasonPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (s?.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const seasonId = Number(id);
  if (!Number.isFinite(seasonId)) notFound();

  const season = await db.query.seasons.findFirst({ where: eq(seasons.id, seasonId) });
  if (!season) notFound();
  if (season.status !== "ended") redirect(`/admin/seasons/${season.id}`);

  // Divisions of this season.
  const seasonDivisions = await db
    .select()
    .from(divisions)
    .where(eq(divisions.seasonId, seasonId))
    .orderBy(asc(divisions.name));
  const divisionIds = seasonDivisions.map((d) => d.id);
  const divisionName = new Map(seasonDivisions.map((d) => [d.id, d.name]));

  // Teams (grouped by division), players, season matches, default/published brackets.
  const seasonTeams = divisionIds.length
    ? await db.select().from(teams).where(inArray(teams.divisionId, divisionIds)).orderBy(asc(teams.name))
    : [];
  const teamIds = seasonTeams.map((t) => t.id);

  const seasonPlayers = teamIds.length
    ? await db.select().from(players).where(inArray(players.teamId, teamIds)).orderBy(asc(players.jerseyNumber))
    : [];

  const seasonMatches = await db.select().from(matches).where(eq(matches.seasonId, seasonId));

  const seasonBrackets = divisionIds.length
    ? await db.select().from(brackets).where(inArray(brackets.divisionId, divisionIds))
    : [];

  // Standings input: every team labelled by its division name.
  const standingRows = computeStandings(
    seasonTeams.map((t) => ({ id: t.id, name: t.name, division: divisionName.get(t.divisionId) ?? "—" })),
    seasonMatches.map((m) => ({
      id: m.id,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      status: m.status,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
    })),
  );

  // For each division, pick its default bracket, else any published one.
  const bracketTrees = await Promise.all(
    seasonDivisions.map(async (d) => {
      const divBrackets = seasonBrackets.filter((b) => b.divisionId === d.id);
      const chosen = divBrackets.find((b) => b.isDefault) ?? divBrackets.find((b) => b.isPublished);
      if (!chosen) return null;
      const tree = await loadBracketTree(db, chosen.id);
      return { division: d, tree };
    }),
  );

  const playersByTeam = new Map<number, typeof seasonPlayers>();
  for (const p of seasonPlayers) {
    const list = playersByTeam.get(p.teamId) ?? [];
    list.push(p);
    playersByTeam.set(p.teamId, list);
  }

  const started = new Date(season.startedAt).toLocaleDateString();
  const ended = season.endedAt ? new Date(season.endedAt).toLocaleDateString() : "—";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin/seasons/archive" className="text-sm text-primary hover:underline">← Archive</Link>
        <Badge variant="outline">ended</Badge>
      </div>

      <div>
        <h1 className="text-3xl font-semibold">{season.name}</h1>
        <p className="text-sm text-muted-foreground">Season {started}–{ended}</p>
      </div>

      {/* Divisions + teams + rosters */}
      <section className="space-y-4">
        <h2 className="font-semibold text-primary">Divisions &amp; rosters</h2>
        {seasonDivisions.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">No divisions.</Card>
        ) : (
          seasonDivisions.map((d) => {
            const divTeams = seasonTeams.filter((t) => t.divisionId === d.id);
            return (
              <Card key={d.id} className="p-5 space-y-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold">{d.name}</h3>
                  <span className="text-xs text-muted-foreground">{divTeams.length} teams</span>
                </div>
                {divTeams.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No teams.</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {divTeams.map((t) => {
                      const roster = playersByTeam.get(t.id) ?? [];
                      return (
                        <div key={t.id} className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-medium">{t.name}</span>
                            <span className="text-xs text-muted-foreground">{roster.length} players</span>
                          </div>
                          {roster.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No players.</p>
                          ) : (
                            <ul className="space-y-1 text-sm">
                              {roster.map((p) => (
                                <li key={p.id} className="flex items-center gap-2">
                                  <span className="w-7 shrink-0 tabular-nums text-muted-foreground">#{p.jerseyNumber}</span>
                                  <span className="flex-1 truncate">{p.name}</span>
                                  <Badge variant="outline" className="shrink-0">{p.position}</Badge>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </section>

      {/* Standings */}
      <section className="space-y-4">
        {standingRows.length === 0 ? (
          <>
            <h2 className="font-semibold text-primary">Standings</h2>
            <Card className="p-6 text-sm text-muted-foreground">No teams to rank.</Card>
          </>
        ) : (
          <StandingsTable title="Standings" rows={standingRows} />
        )}
      </section>

      {/* Brackets */}
      <section className="space-y-6">
        <h2 className="font-semibold text-primary">Brackets</h2>
        {bracketTrees.every((b) => b == null) ? (
          <Card className="p-6 text-sm text-muted-foreground">No published brackets.</Card>
        ) : (
          bracketTrees.map((entry) =>
            entry ? (
              <Card key={entry.division.id} className="p-5">
                <BracketGrid rounds={entry.tree.rounds} title={`${entry.division.name} — ${entry.tree.bracket.title}`} />
              </Card>
            ) : null,
          )
        )}
      </section>
    </div>
  );
}
