import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { seasons } from "@/db/schema";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SeasonArchivePage() {
  const s = await getSession();
  if (s?.role !== "admin") redirect("/dashboard");

  const ended = await db
    .select()
    .from(seasons)
    .where(eq(seasons.status, "ended"))
    .orderBy(desc(seasons.id));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/seasons" className="text-sm text-primary hover:underline">← Seasons</Link>
        <h1 className="mt-2 text-3xl font-semibold">Season archive</h1>
        <p className="text-sm text-muted-foreground">Read-only records of ended seasons.</p>
      </div>

      {ended.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No ended seasons yet.
        </Card>
      ) : (
        <div className="space-y-3">
          {ended.map((season) => (
            <Link key={season.id} href={`/admin/seasons/archive/${season.id}`} className="block">
              <Card className="p-4 hover:border-primary/50 transition-colors flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{season.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {new Date(season.startedAt).toLocaleDateString()}
                    {" – "}
                    {season.endedAt ? new Date(season.endedAt).toLocaleDateString() : "—"}
                  </p>
                </div>
                <span className="text-sm text-primary">View →</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
