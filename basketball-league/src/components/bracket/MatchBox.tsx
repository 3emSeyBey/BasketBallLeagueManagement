"use client";
import Link from "next/link";
import { CalendarDays, Crown, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type MatchStatus = "scheduled" | "live" | "final";

type TeamLite = { id: number; name: string } | null;

export type MatchLike = {
  id: number;
  homeTeam: TeamLite;
  awayTeam: TeamLite;
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  scheduledAt: string;
  isDivisionFinal?: boolean;
  isSeasonFinal?: boolean;
};

function TeamRow({
  name,
  score,
  state,
}: {
  name: string | null | undefined;
  score: number | null;
  state: "winner" | "loser" | "neutral";
}) {
  const isTBD = !name;
  return (
    <div
      className={cn(
        "group/team flex items-center justify-between gap-2 rounded-md px-3 py-2 ring-1 transition-colors",
        state === "winner"
          ? "bg-primary/15 ring-primary/40 text-foreground"
          : state === "loser"
            ? "bg-muted/30 ring-white/5 text-muted-foreground"
            : "bg-background/60 ring-white/10 text-foreground/90",
      )}
    >
      <span
        className={cn(
          "truncate text-sm",
          state === "winner" && "font-semibold",
          isTBD && "italic text-muted-foreground",
        )}
      >
        {name ?? "TBD"}
      </span>
      <span
        className={cn(
          "tabular-nums text-sm",
          state === "winner" ? "font-semibold" : "text-muted-foreground",
        )}
      >
        {score ?? ""}
      </span>
    </div>
  );
}

export function MatchBox({
  match,
  href,
  compact = false,
}: {
  match: MatchLike;
  href?: string;
  compact?: boolean;
}) {
  const homeWin =
    match.status === "final" && match.homeScore > match.awayScore;
  const awayWin =
    match.status === "final" && match.awayScore > match.homeScore;
  const homeState: "winner" | "loser" | "neutral" =
    match.status === "final"
      ? homeWin
        ? "winner"
        : "loser"
      : "neutral";
  const awayState: "winner" | "loser" | "neutral" =
    match.status === "final"
      ? awayWin
        ? "winner"
        : "loser"
      : "neutral";

  const isFinalMatch = match.isDivisionFinal || match.isSeasonFinal;

  const card = (
    <div
      className={cn(
        "group/match relative rounded-xl bg-card/85 ring-1 ring-white/10 shadow-md shadow-black/30 backdrop-blur-sm transition-all",
        "hover:ring-primary/40 hover:shadow-primary/10",
        match.isSeasonFinal && "ring-primary/40 shadow-primary/20",
        compact ? "min-w-44 w-44" : "min-w-56 w-56",
      )}
    >
      {isFinalMatch && (
        <div
          className={cn(
            "flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-t-xl",
            match.isSeasonFinal
              ? "bg-gradient-to-r from-primary/30 to-primary/10 text-primary"
              : "bg-primary/10 text-primary",
          )}
        >
          {match.isSeasonFinal ? (
            <Crown className="size-3" />
          ) : (
            <Trophy className="size-3" />
          )}
          {match.isSeasonFinal ? "Championship" : "Division Final"}
        </div>
      )}
      <div className="p-2 space-y-1.5">
        <TeamRow
          name={match.homeTeam?.name}
          score={match.status === "final" ? match.homeScore : null}
          state={homeState}
        />
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-x-2 h-px bg-white/5" />
          <span className="relative z-10 px-1.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground bg-card/85">
            vs
          </span>
        </div>
        <TeamRow
          name={match.awayTeam?.name}
          score={match.status === "final" ? match.awayScore : null}
          state={awayState}
        />
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-t border-white/5">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="size-3" />
          {new Date(match.scheduledAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 font-semibold",
            match.status === "live" && "text-red-400",
            match.status === "final" && "text-emerald-400",
          )}
        >
          {match.status === "live" && (
            <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
          )}
          {match.status}
        </span>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl"
      >
        {card}
      </Link>
    );
  }
  return card;
}
