import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq, notInArray } from "drizzle-orm";
import { db } from "@/db/client";
import { seasons, teams, seasonTeams } from "@/db/schema";
import { getSession } from "@/lib/session";
import { loadCanvas } from "@/lib/season-bracket-query";
import { SeasonCanvas } from "@/components/canvas/SeasonCanvas";

export const dynamic = "force-dynamic";

export default async function SeasonCanvasPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session?.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const seasonId = Number(id);
  if (!Number.isFinite(seasonId)) notFound();

  const season = await db.query.seasons.findFirst({ where: eq(seasons.id, seasonId) });
  if (!season) notFound();

  const view = await loadCanvas(seasonId);

  // Available teams = teams not yet enrolled in this season
  const enrolled = await db.select({ teamId: seasonTeams.teamId }).from(seasonTeams).where(eq(seasonTeams.seasonId, seasonId));
  const enrolledIds = enrolled.map(r => r.teamId);
  const availableTeams = enrolledIds.length === 0
    ? await db.select({ id: teams.id, name: teams.name }).from(teams)
    : await db.select({ id: teams.id, name: teams.name }).from(teams).where(notInArray(teams.id, enrolledIds));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/admin/seasons/${seasonId}`} className="text-sm text-primary hover:underline">← Season settings</Link>
        <span className="text-xs text-muted-foreground">{season.status}</span>
      </div>

      <div>
        <h1 className="text-3xl font-semibold">{season.name} — Canvas</h1>
        <p className="text-sm text-muted-foreground">
          Compose matches per division. Pool stays open until each division&apos;s round-2 match reaches its scheduled time.
        </p>
      </div>

      {view.divisions.length === 0 ? (
        <p className="text-sm text-muted-foreground border border-dashed rounded-md p-6 text-center">
          No divisions yet. Add divisions on the season settings page first.
        </p>
      ) : (
        <SeasonCanvas
          seasonId={seasonId}
          view={view}
          availableTeamsForSeason={availableTeams}
        />
      )}
    </div>
  );
}
