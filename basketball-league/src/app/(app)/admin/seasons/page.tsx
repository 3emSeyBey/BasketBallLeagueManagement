import Link from "next/link";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { seasons, teams } from "@/db/schema";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateSeasonForm } from "@/components/admin/CreateSeasonForm";

export const dynamic = "force-dynamic";

export default async function AdminSeasonsPage() {
  const s = await getSession();
  if (s?.role !== "admin") redirect("/dashboard");

  const [allSeasons, allTeams] = await Promise.all([
    db.select().from(seasons).orderBy(desc(seasons.id)),
    db.select().from(teams).orderBy(teams.name),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Seasons</h1>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Start a new season</h2>
        <CreateSeasonForm teams={allTeams} />
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Status</th>
                <th className="p-3">Bracket</th>
                <th className="p-3">Started</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allSeasons.map(season => (
                <tr key={season.id} className="border-b">
                  <td className="p-3 font-medium">{season.name}</td>
                  <td className="p-3"><Badge variant="outline">{season.status}</Badge></td>
                  <td className="p-3 text-sm text-muted-foreground">{season.bracketType}</td>
                  <td className="p-3 text-sm">{new Date(season.startedAt).toLocaleDateString()}</td>
                  <td className="p-3 text-right">
                    <Link href={`/admin/seasons/${season.id}`} className="text-sm text-primary hover:underline">
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
              {allSeasons.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-sm text-muted-foreground text-center">No seasons yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
