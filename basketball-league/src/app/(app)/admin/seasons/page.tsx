import Link from "next/link";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { seasons } from "@/db/schema";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminSeasonsPage() {
  const s = await getSession();
  if (s?.role !== "admin") redirect("/dashboard");

  const allSeasons = await db.select().from(seasons).orderBy(desc(seasons.id));
  const activeSeasons = allSeasons.filter(season => season.status !== "ended");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-semibold">Leagues</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/seasons/new" className={buttonVariants({ size: "lg" })}>
            + Add a new league
          </Link>
          <Link
            href="/admin/seasons/archive"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            View league archive
          </Link>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Status</th>
                <th className="p-3">Started</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeSeasons.map(season => (
                <tr key={season.id} className="border-b">
                  <td className="p-3 font-medium">{season.name}</td>
                  <td className="p-3"><Badge variant="outline">{season.status}</Badge></td>
                  <td className="p-3 text-sm">{new Date(season.startedAt).toLocaleDateString()}</td>
                  <td className="p-3 text-right">
                    <Link href={`/admin/seasons/${season.id}`} className="text-sm text-primary hover:underline">
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
              {activeSeasons.length === 0 && (
                <tr><td colSpan={4} className="p-4 text-sm text-muted-foreground text-center">No active or draft league. Add one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
