import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches, teams } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StreamPlayer } from "@/components/stream/StreamPlayer";

export const dynamic = "force-dynamic";

export default async function PublicMatchDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const m = await db.query.matches.findFirst({ where: eq(matches.id, Number(id)) });
  if (!m) notFound();
  const home = await db.query.teams.findFirst({ where: eq(teams.id, m.homeTeamId) });
  const away = await db.query.teams.findFirst({ where: eq(teams.id, m.awayTeamId) });
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
          {m.homeScore} <span className="text-muted-foreground mx-3">—</span> {m.awayScore}
        </div>
      </Card>
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Live Stream</h2>
        <StreamPlayer matchId={m.id} />
      </Card>
    </div>
  );
}
