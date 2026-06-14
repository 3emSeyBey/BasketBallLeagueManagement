import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { divisions, seasons, teams } from "@/db/schema";
import { getSession } from "@/lib/session";
import { loadBracketTree } from "@/lib/bracket-service";
import { BracketCanvas, type BracketData } from "@/components/brackets/BracketCanvas";

export const dynamic = "force-dynamic";

export default async function BracketCanvasPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (s?.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const bracketId = Number(id);
  if (!Number.isFinite(bracketId)) notFound();

  const tree = await loadBracketTree(db, bracketId).catch(() => null);
  if (!tree) notFound();

  const division = await db.query.divisions.findFirst({ where: eq(divisions.id, tree.bracket.divisionId) });
  const season = division ? await db.query.seasons.findFirst({ where: eq(seasons.id, division.seasonId) }) : null;
  const divTeams = division
    ? await db.select({ id: teams.id, name: teams.name, imageMimeType: teams.imageMimeType, logoColor: teams.logoColor })
        .from(teams).where(eq(teams.divisionId, division.id))
    : [];

  const data: BracketData = {
    bracket: tree.bracket,
    rounds: tree.rounds,
    division: division ? { id: division.id, name: division.name } : null,
    season: season ? { id: season.id, name: season.name } : null,
    divisionTeams: divTeams.map((t) => ({
      id: t.id,
      name: t.name,
      hasLogo: t.imageMimeType != null,
      color: t.logoColor,
    })),
  };

  return <BracketCanvas initial={data} />;
}
