"use client";

import type { CanvasMatch } from "@/lib/season-bracket-query";

export function MatchCard({ match, onClick }: { match: CanvasMatch; onClick?: () => void }) {
  const homeWin = match.status === "final" && match.homeScore > match.awayScore;
  const awayWin = match.status === "final" && match.awayScore > match.homeScore;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-md ring-1 ring-foreground/10 bg-card hover:ring-primary/40 transition overflow-hidden"
    >
      <div className={`px-3 py-2 flex items-center justify-between gap-2 ${homeWin ? "bg-primary/10 font-medium" : ""}`}>
        <span className="truncate">{match.homeTeam?.name ?? <em className="text-muted-foreground">TBD</em>}</span>
        <span className="tabular-nums text-sm">{match.status === "final" ? match.homeScore : ""}</span>
      </div>
      <div className={`px-3 py-2 flex items-center justify-between gap-2 border-t ${awayWin ? "bg-primary/10 font-medium" : ""}`}>
        <span className="truncate">{match.awayTeam?.name ?? <em className="text-muted-foreground">TBD</em>}</span>
        <span className="tabular-nums text-sm">{match.status === "final" ? match.awayScore : ""}</span>
      </div>
      <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/40 flex items-center justify-between gap-2">
        <span>{new Date(match.scheduledAt).toLocaleDateString()}</span>
        <span className="flex items-center gap-1">
          {match.isDivisionFinal && <span className="text-primary">DIV FINAL</span>}
          {match.isSeasonFinal && <span className="text-primary">SEASON FINAL</span>}
          <span>{match.status}</span>
        </span>
      </div>
    </button>
  );
}
