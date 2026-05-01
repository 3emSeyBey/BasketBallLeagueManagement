import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Volleyball } from "lucide-react";
import { db } from "@/db/client";
import { teams, players, users } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamForm } from "@/components/teams/TeamForm";
import { DeleteTeamButton } from "@/components/teams/DeleteTeamButton";
import { ChangeManagerDialog } from "@/components/teams/ChangeManagerDialog";
import { getSession } from "@/lib/session";

export default async function TeamDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  const team = await db.query.teams.findFirst({ where: eq(teams.id, Number(id)) });
  if (!team) notFound();
  const [roster, managers] = await Promise.all([
    db.select({
      id: players.id,
      name: players.name,
      jerseyNumber: players.jerseyNumber,
      position: players.position,
      imageMimeType: players.imageMimeType,
    }).from(players).where(eq(players.teamId, team.id)).orderBy(players.jerseyNumber),
    db.select({
        id: users.id,
        email: users.email,
        username: users.username,
        name: users.name,
        contactNumber: users.contactNumber,
      })
      .from(users)
      .where(and(eq(users.teamId, team.id), eq(users.role, "team_manager"))),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Manager</h2>
          {session.role === "admin" && <ChangeManagerDialog teamId={team.id} />}
        </div>
        {managers.length === 0
          ? <p className="text-sm text-muted-foreground">No manager assigned.</p>
          : <ul className="space-y-3">
              {managers.map(m => (
                <li key={m.id} className="text-sm space-y-1">
                  <p className="font-medium text-base">{m.name || "(no name)"}</p>
                  <p className="text-muted-foreground">{m.email} · @{m.username ?? "—"}</p>
                  {m.contactNumber && <p className="text-muted-foreground">Contact: {m.contactNumber}</p>}
                </li>
              ))}
            </ul>}
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Roster ({roster.length})</h2>
        {roster.length === 0 ? <p className="text-sm text-muted-foreground">No players yet.</p> : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {roster.map(p => (
              <li key={p.id}>
                <a
                  href={`/players/${p.id}`}
                  className="flex items-center justify-between border rounded-md p-3 hover:border-primary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {p.imageMimeType ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/players/${p.id}/image`} alt={p.name} className="size-9 rounded-full object-cover bg-muted" />
                    ) : (
                      <span className="size-9 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold text-xs">#{p.jerseyNumber}</span>
                    )}
                    <span className="font-medium">
                      {p.name}
                      <span className="ml-1.5 text-muted-foreground/70 font-normal">
                        #{p.jerseyNumber}
                      </span>
                    </span>
                  </div>
                  <Badge variant="outline">{p.position}</Badge>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {session.role === "admin" && (
        <>
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold">Edit Team</h2>
            <TeamForm
              id={team.id}
              initial={{ name: team.name, division: team.division }}
              hasExistingImage={!!team.imageMimeType}
            />
          </Card>
          <Card className="p-6 space-y-4 border-destructive/30">
            <div className="space-y-1">
              <h2 className="font-semibold text-destructive">Danger zone</h2>
              <p className="text-sm text-muted-foreground">
                Removing this team deletes its roster and matches. Assigned team managers become unassigned.
              </p>
            </div>
            <DeleteTeamButton teamId={team.id} teamName={team.name} />
          </Card>
        </>
      )}
    </div>
  );
}
