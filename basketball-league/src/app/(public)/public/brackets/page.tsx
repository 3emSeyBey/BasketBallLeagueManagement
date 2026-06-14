import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { brackets, divisions, seasons } from "@/db/schema";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function PublicBracketsPage() {
  const rows = await db
    .select({
      id: brackets.id,
      title: brackets.title,
      isPublished: brackets.isPublished,
      divisionName: divisions.name,
      seasonName: seasons.name,
    })
    .from(brackets)
    .innerJoin(divisions, eq(divisions.id, brackets.divisionId))
    .innerJoin(seasons, eq(seasons.id, divisions.seasonId))
    .orderBy(asc(seasons.id), asc(divisions.name), asc(brackets.id));

  const published = rows.filter((r) => r.isPublished);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Brackets</h1>
      {published.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">No published brackets yet.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {published.map((r) => (
            <Link key={r.id} href={`/public/brackets/${r.id}`}>
              <Card className="h-full p-4 transition hover:ring-2 hover:ring-primary/40">
                <p className="text-xs text-muted-foreground">{r.seasonName} · {r.divisionName}</p>
                <h3 className="font-semibold">{r.title}</h3>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
