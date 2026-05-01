import Link from "next/link";
import { and, eq, gte, isNotNull } from "drizzle-orm";
import { CalendarDays, ChevronRight, Trophy } from "lucide-react";
import { db } from "@/db/client";
import { teams, matches, players, seasons } from "@/db/schema";
import { getSession } from "@/lib/session";
import { listAnnouncements } from "@/lib/announcements-query";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";

export default async function Dashboard() {
  const session = (await getSession())!;
  const today = new Date().toISOString();
  const [allTeams, upcoming, allPlayers, announcements, activeSeason] = await Promise.all([
    db.select().from(teams),
    db.select().from(matches).where(and(isNotNull(matches.scheduledAt), gte(matches.scheduledAt, today))).orderBy(matches.scheduledAt).limit(5),
    db.select().from(players),
    listAnnouncements(3),
    db.query.seasons.findFirst({ where: eq(seasons.status, "active") }),
  ]);
  const teamById = new Map(allTeams.map((t) => [t.id, t]));

  let myRoster: typeof allPlayers = [];
  if (session.role === "team_manager" && session.teamId) {
    myRoster = await db.select().from(players).where(eq(players.teamId, session.teamId));
  }

  const seasonHref = session.role === "admin"
    ? (activeSeason ? `/admin/seasons/${activeSeason.id}` : "/admin/seasons")
    : "/standings";
  const seasonValue = activeSeason?.name ?? "Create";

  const tiles = session.role === "admin"
    ? [
        { label: "Total Teams", value: allTeams.length, href: "/teams" },
        { label: "Total Players", value: allPlayers.length, href: "/teams" },
        { label: "Active Season", value: seasonValue, href: seasonHref },
      ]
    : [
        { label: "My Roster", value: myRoster.length, href: "/players" },
        { label: "Active Season", value: seasonValue, href: seasonHref },
      ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <Link
          href="/standings"
          className={buttonVariants({
            variant: "outline",
            size: "lg",
            className: "gap-2",
          })}
        >
          <Trophy className="size-4" />
          View Standings
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href}>
            <Card className="p-5 hover:border-primary transition-colors h-full">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{t.label}</p>
              <p className="text-3xl font-semibold mt-2 truncate">{t.value}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-primary" />
            <h2 className="font-semibold">Upcoming Matches</h2>
          </div>
          <Link
            href="/schedule"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            View schedule
            <ChevronRight className="size-4" />
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming matches scheduled.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {upcoming.map((m) => {
              const home = m.homeTeamId ? teamById.get(m.homeTeamId) : null;
              const away = m.awayTeamId ? teamById.get(m.awayTeamId) : null;
              const dt = new Date(m.scheduledAt!);
              return (
                <li key={m.id}>
                  <Link
                    href={`/schedule/${m.id}`}
                    className="flex items-center justify-between gap-4 py-3 hover:bg-white/5 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex flex-col items-center justify-center rounded-md bg-muted/40 ring-1 ring-white/10 px-2.5 py-1 text-center shrink-0">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {dt.toLocaleDateString(undefined, { month: "short" })}
                        </span>
                        <span className="text-sm font-semibold leading-none">
                          {dt.getDate()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {home?.name ?? "TBD"}{" "}
                          <span className="text-muted-foreground">vs</span>{" "}
                          {away?.name ?? "TBD"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {dt.toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {m.venue ? ` · ${m.venue}` : ""}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Latest Announcements</h2>
          <Link href="/announcements" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        {announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {announcements.map((a) => (
              <AnnouncementCard key={a.id} announcement={a} linkBase="/announcements" />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
