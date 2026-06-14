import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db/client";
import { divisions, seasons } from "@/db/schema";
import { loadBracketTree } from "@/lib/bracket-service";
import { BracketGrid } from "@/components/brackets/BracketGrid";

export const dynamic = "force-dynamic";

export default async function PublicBracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bracketId = Number(id);
  if (!Number.isFinite(bracketId)) notFound();

  const tree = await loadBracketTree(db, bracketId).catch(() => null);
  if (!tree || !tree.bracket.isPublished) notFound();

  const division = await db.query.divisions.findFirst({ where: eq(divisions.id, tree.bracket.divisionId) });
  const season = division ? await db.query.seasons.findFirst({ where: eq(seasons.id, division.seasonId) }) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/public/brackets" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <p className="text-xs text-muted-foreground">{season?.name} · {division?.name}</p>
          <h1 className="text-2xl font-semibold">{tree.bracket.title}</h1>
        </div>
      </div>
      <div className="rounded-xl border bg-muted/20 p-4">
        <BracketGrid rounds={tree.rounds} />
      </div>
    </div>
  );
}
