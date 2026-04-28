import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { teams, players } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamForm } from "@/components/teams/TeamForm";
import { getSession } from "@/lib/session";

export default async function TeamDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  const team = await db.query.teams.findFirst({ where: eq(teams.id, Number(id)) });
  if (!team) notFound();
  const roster = await db.select().from(players).where(eq(players.teamId, team.id)).orderBy(players.jerseyNumber);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-xl bg-muted grid place-items-center text-2xl">🏀</div>
          <div>
            <h1 className="text-3xl font-semibold">{team.name}</h1>
            <Badge variant="outline">Division {team.division}</Badge>
          </div>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Roster ({roster.length})</h2>
        {roster.length === 0 ? <p className="text-sm text-muted-foreground">No players yet.</p> : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {roster.map(p => (
              <li key={p.id} className="flex items-center justify-between border rounded-md p-3">
                <span className="font-medium">#{p.jerseyNumber} {p.name}</span>
                <Badge variant="outline">{p.position}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {session.role === "admin" && (
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold">Edit Team</h2>
          <TeamForm id={team.id} initial={{ name: team.name, division: team.division, logoUrl: team.logoUrl }} />
        </Card>
      )}
    </div>
  );
}
