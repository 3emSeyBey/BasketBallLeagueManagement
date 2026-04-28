import Link from "next/link";
import { eq, gte } from "drizzle-orm";
import { db } from "@/db/client";
import { teams, matches, players } from "@/db/schema";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui/card";

export default async function Dashboard() {
  const session = (await getSession())!;
  const today = new Date().toISOString();
  const [allTeams, upcoming, allPlayers] = await Promise.all([
    db.select().from(teams),
    db.select().from(matches).where(gte(matches.scheduledAt, today)).orderBy(matches.scheduledAt).limit(5),
    db.select().from(players),
  ]);

  let myRoster: typeof allPlayers = [];
  if (session.role === "team_manager" && session.teamId) {
    myRoster = await db.select().from(players).where(eq(players.teamId, session.teamId));
  }

  const tiles = session.role === "admin"
    ? [
        { label: "Total Teams", value: allTeams.length, href: "/teams" },
        { label: "Total Players", value: allPlayers.length, href: "/teams" },
        { label: "Upcoming Games", value: upcoming.length, href: "/schedule" },
        { label: "Active Season", value: "2026", href: "/standings" },
      ]
    : [
        { label: "My Roster", value: myRoster.length, href: "/players" },
        { label: "Upcoming Games", value: upcoming.length, href: "/schedule" },
        { label: "Standings", value: "View", href: "/standings" },
      ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map(t => (
          <Link key={t.label} href={t.href}>
            <Card className="p-5 hover:border-primary transition-colors">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{t.label}</p>
              <p className="text-3xl font-semibold mt-2">{t.value}</p>
            </Card>
          </Link>
        ))}
      </div>
      <Card className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Upcoming Matches</h2>
          <Link href="/schedule" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {upcoming.length === 0
          ? <p className="text-sm text-muted-foreground">No upcoming matches scheduled.</p>
          : <ul className="divide-y">
              {upcoming.map(m => (
                <li key={m.id} className="py-3 flex justify-between text-sm">
                  <span>{new Date(m.scheduledAt).toLocaleString()}</span>
                  <Link href={`/schedule/${m.id}`} className="text-primary hover:underline">{m.venue}</Link>
                </li>
              ))}
            </ul>}
      </Card>
    </div>
  );
}
