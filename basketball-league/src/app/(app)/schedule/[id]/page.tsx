import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches, teams } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreForm } from "@/components/schedule/ScoreForm";
import { ScheduleEditDialog } from "@/components/schedule/ScheduleEditDialog";
import { StreamHost } from "@/components/stream/StreamHost";
import { StreamPlayer } from "@/components/stream/StreamPlayer";
import { getSession } from "@/lib/session";
import { canManageTeam } from "@/lib/rbac";

export default async function MatchDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const m = await db.query.matches.findFirst({
    where: eq(matches.id, Number(id)),
  });
  if (!m) notFound();
  const home = m.homeTeamId
    ? await db.query.teams.findFirst({ where: eq(teams.id, m.homeTeamId) })
    : null;
  const away = m.awayTeamId
    ? await db.query.teams.findFirst({ where: eq(teams.id, m.awayTeamId) })
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">
            {home?.name ?? "TBD"} vs {away?.name ?? "TBD"}
          </h1>
          <p className="text-muted-foreground">
            {new Date(m.scheduledAt).toLocaleString()} · {m.venue}
          </p>
        </div>
        <Badge>{m.status}</Badge>
      </div>

      <Card className="p-8 text-center">
        <div className="text-5xl font-semibold tracking-tight">
          {m.homeScore}{" "}
          <span className="text-muted-foreground mx-3">—</span> {m.awayScore}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Live Stream</h2>
        {session?.role === "admin" ||
        (m.homeTeamId !== null && canManageTeam(session ?? null, m.homeTeamId)) ||
        (m.awayTeamId !== null && canManageTeam(session ?? null, m.awayTeamId)) ? (
          <StreamHost matchId={m.id} />
        ) : (
          <StreamPlayer matchId={m.id} />
        )}
      </Card>

      {session?.role === "admin" && (
        <>
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Schedule</h2>
              <ScheduleEditDialog matchId={m.id} initialScheduledAt={m.scheduledAt} initialVenue={m.venue} />
            </div>
            <p className="text-sm text-muted-foreground">{new Date(m.scheduledAt).toLocaleString()} · {m.venue}</p>
          </Card>
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold">Update Score / Status</h2>
            <ScoreForm
              matchId={m.id}
              initial={{
                home: m.homeScore,
                away: m.awayScore,
                status: m.status,
              }}
            />
          </Card>
        </>
      )}
    </div>
  );
}
