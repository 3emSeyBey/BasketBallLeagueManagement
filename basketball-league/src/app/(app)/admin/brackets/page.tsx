import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { brackets, divisions, seasons } from "@/db/schema";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";
import { CreateBracketWizard } from "@/components/brackets/CreateBracketWizard";

export const dynamic = "force-dynamic";

export default async function AdminBracketsPage() {
  const s = await getSession();
  if (s?.role !== "admin") redirect("/dashboard");

  const rows = await db
    .select({
      id: brackets.id,
      title: brackets.title,
      isDefault: brackets.isDefault,
      isPublished: brackets.isPublished,
      divisionId: brackets.divisionId,
      divisionName: divisions.name,
      seasonName: seasons.name,
    })
    .from(brackets)
    .innerJoin(divisions, eq(divisions.id, brackets.divisionId))
    .innerJoin(seasons, eq(seasons.id, divisions.seasonId))
    .orderBy(asc(seasons.id), asc(divisions.name), asc(brackets.id));

  const divisionRows = await db
    .select({ id: divisions.id, name: divisions.name, seasonName: seasons.name })
    .from(divisions)
    .innerJoin(seasons, eq(seasons.id, divisions.seasonId))
    .orderBy(asc(seasons.id), asc(divisions.name));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Brackets</h1>
          <p className="text-sm text-muted-foreground">Draw and publish match brackets per division.</p>
        </div>
        <CreateBracketWizard
          divisions={divisionRows}
          brackets={rows.map((r) => ({ id: r.id, title: r.title, divisionId: r.divisionId }))}
        />
      </div>

      {rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No brackets yet. Click <span className="font-medium">New bracket</span> to draw one.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <Link key={r.id} href={`/admin/brackets/${r.id}`}>
              <Card className="h-full p-4 transition hover:ring-2 hover:ring-primary/40">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{r.seasonName} · {r.divisionName}</p>
                    <h3 className="font-semibold">{r.title}</h3>
                  </div>
                  {r.isDefault ? <Star className="size-4 shrink-0 text-amber-500" /> : null}
                </div>
                <div className="mt-3">
                  {r.isPublished ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-600">Published</span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Draft</span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
