import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches, teams } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { ScheduleEditDialog } from "@/components/schedule/ScheduleEditDialog";
import { LiveScoreBoard } from "@/components/schedule/LiveScoreBoard";
import { MatchStatusBadge } from "@/components/schedule/MatchStatusBadge";
import { DeleteMatchButton } from "@/components/schedule/DeleteMatchButton";
import { StreamHost } from "@/components/stream/StreamHost";
import { StreamPlayer } from "@/components/stream/StreamPlayer";
import { getSession } from "@/lib/session";
import { canManageTeam } from "@/lib/rbac";
import { effectiveMatchStatus } from "@/lib/match-status";

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

  const isHost =
    session?.role === "admin" ||
    (m.homeTeamId !== null && canManageTeam(session ?? null, m.homeTeamId)) ||
    (m.awayTeamId !== null && canManageTeam(session ?? null, m.awayTeamId));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">
            {home?.name ?? "TBD"} vs {away?.name ?? "TBD"}
          </h1>
          <p className="text-muted-foreground">
            {m.scheduledAt
              ? `${new Date(m.scheduledAt).toLocaleString()} · ${m.venue}`
              : `Unscheduled · ${m.venue}`}
          </p>
        </div>
        <MatchStatusBadge
          matchId={m.id}
          initialStatus={m.status}
          initialScheduledAt={m.scheduledAt}
        />
      </div>

      {(() => {
        const effective = effectiveMatchStatus(m.status, m.scheduledAt);
        if (effective === "planned" || effective === "scheduled") return null;
        return (
          <LiveScoreBoard
            matchId={m.id}
            homeName={home?.name ?? "Home"}
            awayName={away?.name ?? "Away"}
            initialHome={m.homeScore}
            initialAway={m.awayScore}
            canEdit={session?.role === "admin" && m.status !== "ended"}
          />
        );
      })()}

      {(() => {
        const effective = effectiveMatchStatus(m.status, m.scheduledAt);
        const showStream = effective === "started" || effective === "live";
        if (!showStream) return null;
        return (
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold">Live Stream</h2>
            {isHost ? (
              <StreamHost matchId={m.id} initialStatus={m.status} />
            ) : (
              <StreamPlayer matchId={m.id} />
            )}
          </Card>
        );
      })()}

      {session?.role === "admin" && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Schedule</h2>
            {m.status !== "ended" && (
              <div className="flex items-center gap-2">
                <ScheduleEditDialog
                  matchId={m.id}
                  initialScheduledAt={m.scheduledAt}
                  initialVenue={m.venue}
                />
                <DeleteMatchButton
                  matchId={m.id}
                  matchup={`${home?.name ?? "TBD"} vs ${away?.name ?? "TBD"}`}
                  redirectTo="/schedule"
                />
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {m.scheduledAt
              ? `${new Date(m.scheduledAt).toLocaleString()} · ${m.venue}`
              : `Unscheduled · ${m.venue}`}
          </p>
          {m.status === "ended" && (
            <p className="text-xs text-muted-foreground">
              Match ended. Schedule is locked.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
