import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { seasons, divisions } from "@/db/schema";
import { getSession } from "@/lib/session";
import { loadBracket } from "@/lib/bracket-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SeedListEditor } from "@/components/bracket/SeedListEditor";
import { BracketView } from "@/components/bracket/BracketView";
import { StartSeasonButton } from "@/components/admin/StartSeasonButton";
import { DivisionManager } from "@/components/divisions/DivisionManager";

export const dynamic = "force-dynamic";

export default async function ManageSeasonPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (s?.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const seasonId = Number(id);
  if (!Number.isFinite(seasonId)) notFound();

  const season = await db.query.seasons.findFirst({ where: eq(seasons.id, seasonId) });
  if (!season) notFound();

  const [{ seeds, matches }, seasonDivisions] = await Promise.all([
    loadBracket(seasonId),
    db.select().from(divisions).where(eq(divisions.seasonId, seasonId)).orderBy(asc(divisions.name)),
  ]);
  const isDraft = season.status === "draft";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin/seasons" className="text-sm text-primary hover:underline">← Seasons</Link>
        <div className="flex items-center gap-3">
          <Badge variant="outline">{season.status}</Badge>
          {isDraft && <StartSeasonButton seasonId={season.id} />}
        </div>
      </div>

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold">{season.name}</h1>
          <p className="text-sm text-muted-foreground">
            {seeds.length} teams · {season.bracketType} · starts {new Date(season.startedAt).toLocaleDateString()}
          </p>
        </div>
        <Link
          href={`/admin/seasons/${season.id}/canvas`}
          className="text-sm text-primary hover:underline"
        >
          Open canvas →
        </Link>
      </div>

      {isDraft && seeds.length >= 2 && (
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold">Seeding draft</h2>
          <SeedListEditor
            seasonId={season.id}
            initialItems={seeds.map(s => ({ teamId: s.teamId!, teamName: s.teamName, seed: s.seed }))}
          />
        </Card>
      )}

      <Card className="p-6 space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-semibold">Divisions</h2>
          <span className="text-xs text-muted-foreground">{seasonDivisions.length} configured</span>
        </div>
        <DivisionManager seasonId={season.id} initialDivisions={seasonDivisions} />
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Bracket preview</h2>
        <BracketView matches={matches} linkBase="/schedule" />
      </Card>
    </div>
  );
}
