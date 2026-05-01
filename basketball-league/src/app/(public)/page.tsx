import Link from "next/link";
import { and, gte, isNotNull } from "drizzle-orm";
import { CalendarDays, ChevronRight, Trophy } from "lucide-react";
import { db } from "@/db/client";
import { teams, matches } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function PublicHome() {
  const today = new Date().toISOString();
  const [allTeams, allMatches, upcoming] = await Promise.all([
    db.select().from(teams),
    db.select().from(matches),
    db
      .select()
      .from(matches)
      .where(and(isNotNull(matches.scheduledAt), gte(matches.scheduledAt, today)))
      .orderBy(matches.scheduledAt)
      .limit(5),
  ]);
  const teamById = new Map(allTeams.map((t) => [t.id, t]));

  return (
    <div className="space-y-8">
      <div className="bg-primary/10 rounded-2xl p-10 text-center">
        <h1 className="text-4xl font-bold">Mayor&apos;s Cup Basketball League</h1>
        <p className="text-muted-foreground mt-2">Bantayan, Cebu — Season 2026</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Overview</h2>
        </div>
        <Link
          href="/public/standings"
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

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Teams</p>
          <p className="text-3xl font-semibold mt-2">{allTeams.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Matches</p>
          <p className="text-3xl font-semibold mt-2">{allMatches.length}</p>
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-primary" />
            <h2 className="font-semibold">Upcoming Matches</h2>
          </div>
          <Link
            href="/public/schedule"
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
                    href={`/public/schedule/${m.id}`}
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
    </div>
  );
}
