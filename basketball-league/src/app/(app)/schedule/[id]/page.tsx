import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches, teams, users } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { ScheduleEditDialog } from "@/components/schedule/ScheduleEditDialog";
import { LiveScoreBoard } from "@/components/schedule/LiveScoreBoard";
import { MatchStatusBadge } from "@/components/schedule/MatchStatusBadge";
import { DeleteMatchButton } from "@/components/schedule/DeleteMatchButton";
import { StreamHost } from "@/components/stream/StreamHost";
import { StreamPlayer } from "@/components/stream/StreamPlayer";
import { ChatBox } from "@/components/stream/ChatBox";
import { getSession } from "@/lib/session";
import { canManageTeam } from "@/lib/rbac";
import { effectiveMatchStatus, isSameMatchDay } from "@/lib/match-status";

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

  // Someone else is actively broadcasting this match (not the current viewer).
  const otherBroadcaster =
    m.broadcasterUserId != null && m.broadcasterUserId !== session?.userId
      ? await db.query.users.findFirst({ where: eq(users.id, m.broadcasterUserId) })
      : null;

  const currentUser = session
    ? await db.query.users.findFirst({ where: eq(users.id, session.userId) })
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">
            {home?.name ?? "TBD"} vs {away?.name ?? "TBD"}
          </h1>
          <p className="text-muted-foreground">
            {m.scheduledAt
              ? `${new Date(m.scheduledAt).toLocaleString()}${m.venue ? ` · ${m.venue}` : ""}`
              : "Not scheduled yet"}
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
          <>
            <LiveScoreBoard
              matchId={m.id}
              homeName={home?.name ?? "Home"}
              awayName={away?.name ?? "Away"}
              initialHome={m.homeScore}
              initialAway={m.awayScore}
              canEdit={session?.role === "admin" && m.status !== "ended"}
            />
            <ChatBox
              matchId={m.id}
              frozen={effective === "ended"}
              loggedInLabel={currentUser ? currentUser.name || currentUser.email : undefined}
            />
          </>
        );
      })()}

      {(() => {
        const effective = effectiveMatchStatus(m.status, m.scheduledAt);
        const isStartedOrLive = effective === "started" || effective === "live";
        // Hosts (admin + assigned managers) can prepare the broadcast any
        // time on the scheduled day, even before the start hour. Viewers
        // only see the stream once the match has actually started.
        const hostMayBroadcastEarly =
          isHost && isSameMatchDay(m.scheduledAt) && m.status !== "ended";
        const showStream = isStartedOrLive || hostMayBroadcastEarly;
        if (!showStream) return null;
        return (
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold">Live Stream</h2>
            {isHost && otherBroadcaster ? (
              <>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
                  <p className="font-medium">
                    {otherBroadcaster.name || otherBroadcaster.email} is currently broadcasting this match live.
                  </p>
                  <p className="text-amber-700/80 dark:text-amber-400/80">
                    To switch broadcasting to this device, contact them to end the broadcast on their end.
                  </p>
                </div>
                <StreamPlayer matchId={m.id} />
              </>
            ) : isHost ? (
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
                  initialVenue={m.venue ?? ""}
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
              ? `${new Date(m.scheduledAt).toLocaleString()}${m.venue ? ` · ${m.venue}` : ""}`
              : "This match doesn't have a schedule yet — add one above."}
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
