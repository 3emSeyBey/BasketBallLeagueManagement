import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { players, teams } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";
import { canManageTeam } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function PlayerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const idNum = Number(id);
  if (!Number.isFinite(idNum)) notFound();

  const player = await db.select({
    id: players.id,
    teamId: players.teamId,
    name: players.name,
    jerseyNumber: players.jerseyNumber,
    position: players.position,
    height: players.height,
    contactNumber: players.contactNumber,
    imageMimeType: players.imageMimeType,
  }).from(players).where(eq(players.id, idNum)).then(r => r[0]);
  if (!player) notFound();

  const team = await db.query.teams.findFirst({ where: eq(teams.id, player.teamId) });
  const canEdit = canManageTeam(session, player.teamId);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <Link href={canEdit ? "/players" : `/teams/${player.teamId}`} className="text-sm text-primary hover:underline">
          ← Back
        </Link>
        {canEdit && (
          <Link href={`/players/${player.id}/edit`}>
            <Button variant="outline" size="sm">Edit player</Button>
          </Link>
        )}
      </div>
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="shrink-0">
            {player.imageMimeType ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/players/${player.id}/image`}
                alt={player.name}
                className="size-40 rounded-xl object-cover bg-muted"
              />
            ) : (
              <div className="size-40 rounded-xl bg-primary/10 text-primary grid place-items-center text-4xl font-semibold">
                #{player.jerseyNumber}
              </div>
            )}
          </div>
          <div className="space-y-4 flex-1">
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold leading-tight">{player.name}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">#{player.jerseyNumber}</Badge>
                <Badge variant="outline">{player.position}</Badge>
                {team && <Badge variant="outline">{team.name}</Badge>}
              </div>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Height</dt>
                <dd>{player.height ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Contact number</dt>
                <dd>{player.contactNumber ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Position</dt>
                <dd>{player.position}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Jersey</dt>
                <dd>#{player.jerseyNumber}</dd>
              </div>
            </dl>
          </div>
        </div>
      </Card>
    </div>
  );
}
