import Link from "next/link";
import { and, eq, gte, inArray, isNotNull, count } from "drizzle-orm";
import { CalendarDays, ChevronRight, Trophy } from "lucide-react";
import { db } from "@/db/client";
import { teams, matches, players, seasons, divisions } from "@/db/schema";
import { getSession } from "@/lib/session";
import { listAnnouncements } from "@/lib/announcements-query";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";

export default async function Dashboard() {
  const session = (await getSession())!;
  const today = new Date().toISOString();
  const [allTeams, upcoming, announcements, activeSeason] = await Promise.all([
    db.select().from(teams),
    db.select().from(matches).where(and(isNotNull(matches.scheduledAt), gte(matches.scheduledAt, today))).orderBy(matches.scheduledAt).limit(5),
    listAnnouncements(3),
    db.query.seasons.findFirst({ where: eq(seasons.status, "active") }),
  ]);
  const teamById = new Map(allTeams.map((t) => [t.id, t]));

  // Counts reflect the ACTIVE season only — archived seasons don't inflate them.
  let activeTeamCount = 0;
  let activePlayerCount = 0;
  if (activeSeason) {
    const divs = await db.select({ id: divisions.id }).from(divisions).where(eq(divisions.seasonId, activeSeason.id));
    const divIds = divs.map((d) => d.id);
    if (divIds.length) {
      const tms = await db.select({ id: teams.id }).from(teams).where(inArray(teams.divisionId, divIds));
      activeTeamCount = tms.length;
      const tmIds = tms.map((t) => t.id);
      if (tmIds.length) {
        activePlayerCount = (await db.select({ c: count() }).from(players).where(inArray(players.teamId, tmIds)))[0].c;
      }
    }
  }

  let myRoster: (typeof players.$inferSelect)[] = [];
  if (session.role === "team_manager" && session.teamId) {
    myRoster = await db.select().from(players).where(eq(players.teamId, session.teamId));
  }

  const seasonHref = session.role === "admin"
    ? (activeSeason ? `/admin/seasons/${activeSeason.id}` : "/admin/seasons")
    : "/standings";
  const seasonValue = activeSeason?.name ?? "Create";

  const tiles: {
    label: string;
    value: string | number;
    href: string;
    subtitle?: string;
    hint?: string;
  }[] = session.role === "admin"
    ? [
        { label: "Teams", value: activeTeamCount, href: "/teams", subtitle: activeSeason ? "this season" : "no active season" },
        { label: "Players", value: activePlayerCount, href: "/teams", subtitle: activeSeason ? "this season" : "no active season" },
        activeSeason
          ? {
              label: "Active Season",
              value: activeSeason.name,
              href: "/admin/seasons",
              subtitle: `Started ${new Date(activeSeason.startedAt).toLocaleDateString()}`,
              hint: "Manage current season · View archive",
            }
          : {
              label: "Active Season",
              value: "None",
              href: "/admin/seasons",
              subtitle: "No active season",
            },
      ]
    : [
        { label: "My Roster", value: myRoster.length, href: "/players" },
        { label: "Active Season", value: seasonValue, href: seasonHref },
      ];

  return (
    <div className="space-y-8">
      {session.status === "pending" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
          <p className="font-medium">Your account is awaiting admin approval.</p>
          <p className="text-amber-700/80 dark:text-amber-400/80">
            Once approved, your team is set up and you can manage your roster. You can browse the league in the meantime.
          </p>
        </div>
      )}
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
              {t.subtitle && (
                <p className="text-xs text-muted-foreground mt-1 truncate">{t.subtitle}</p>
              )}
              {t.hint && (
                <p className="text-[11px] text-muted-foreground/60 mt-1 truncate">{t.hint}</p>
              )}
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
