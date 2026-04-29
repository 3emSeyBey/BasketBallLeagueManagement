import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { teams, players } from "@/db/schema";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { AddPlayerDialog } from "@/components/players/AddPlayerDialog";
import { PlayerList } from "@/components/players/PlayerList";

export default async function PlayersPage() {
  const session = await getSession();
  if (session?.role !== "team_manager" || !session.teamId) redirect("/dashboard");
  const team = await db.query.teams.findFirst({ where: eq(teams.id, session.teamId) });
  if (!team) redirect("/dashboard");
  const roster = await db.select({
    id: players.id,
    name: players.name,
    jerseyNumber: players.jerseyNumber,
    position: players.position,
    height: players.height,
    imageMimeType: players.imageMimeType,
  }).from(players).where(eq(players.teamId, team.id)).orderBy(players.jerseyNumber);
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{team.name} — Players</h1>
          <p className="text-muted-foreground">Manage your team roster ({roster.length} players)</p>
        </div>
        <AddPlayerDialog teamId={team.id} />
      </div>
      <Card className="p-6"><PlayerList players={roster} /></Card>
    </div>
  );
}
