import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches, teams } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreForm } from "@/components/schedule/ScoreForm";
import { getSession } from "@/lib/session";

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
  const home = await db.query.teams.findFirst({
    where: eq(teams.id, m.homeTeamId),
  });
  const away = await db.query.teams.findFirst({
    where: eq(teams.id, m.awayTeamId),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">
            {home?.name} vs {away?.name}
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

      {/* Live stream player placeholder — wired in Phase 9 */}
      <Card className="p-6">
        <h2 className="font-semibold mb-3">Live Stream</h2>
        <p className="text-sm text-muted-foreground">
          Stream player loads here when match is live. Channel:{" "}
          <code>{m.agoraChannel}</code>
        </p>
      </Card>

      {session?.role === "admin" && (
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
      )}
    </div>
  );
}
