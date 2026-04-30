import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Volleyball } from "lucide-react";
import { db } from "@/db/client";
import { teams, players } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function PublicTeamDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const team = await db.query.teams.findFirst({ where: eq(teams.id, Number(id)) });
  if (!team) notFound();
  const roster = await db
    .select()
    .from(players)
    .where(eq(players.teamId, team.id))
    .orderBy(players.jerseyNumber);
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        {team.imageMimeType ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/teams/${team.id}/image`}
            alt={team.name}
            className="size-20 rounded-xl object-cover ring-1 ring-white/10 shadow-lg shadow-black/30"
          />
        ) : (
          <span className="grid size-20 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/20 text-primary">
            <Volleyball className="size-9" />
          </span>
        )}
        <div>
          <h1 className="text-3xl font-semibold">{team.name}</h1>
          <Badge variant="outline">Division {team.division}</Badge>
        </div>
      </div>
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Roster ({roster.length})</h2>
        {roster.length === 0 ? (
          <p className="text-sm text-muted-foreground">No players yet.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {roster.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between border rounded-md p-3"
              >
                <span className="font-medium">
                  #{p.jerseyNumber} {p.name}
                </span>
                <Badge variant="outline">{p.position}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
