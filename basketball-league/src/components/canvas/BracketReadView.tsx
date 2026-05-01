"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BracketTree } from "@/components/bracket/BracketTree";
import type { CanvasView, CanvasMatch } from "@/lib/season-bracket-query";

/**
 * Read-only renderer for the season bracket canvas. Used on the public
 * standings page and other non-admin surfaces.
 */
export function BracketReadView({
  view,
  linkBase = "/schedule",
}: {
  view: CanvasView;
  linkBase?: string;
}) {
  return (
    <div className="space-y-6">
      {view.divisions.map((d) => (
        <Card key={d.id} className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="size-2 rounded-full bg-primary shadow-[0_0_12px_rgba(243,112,33,0.7)]" />
              <h2 className="text-lg font-semibold tracking-tight">{d.name}</h2>
              <span className="text-xs text-muted-foreground">
                {d.teams.length} teams ·{" "}
                {d.locked ? "pool locked" : "pool open"}
                {d.divisionWinner && ` · winner: ${d.divisionWinner.name}`}
              </span>
            </div>
          </div>
          {d.teams.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {d.teams.map((t) => (
                <Badge
                  key={t.team.id}
                  variant={
                    t.status === "permanent_eliminated" ? "outline" : "secondary"
                  }
                  className={
                    t.status === "permanent_eliminated"
                      ? "line-through opacity-60"
                      : ""
                  }
                >
                  {t.team.name}
                </Badge>
              ))}
            </div>
          )}
          <DivisionBracket matches={d.matches} linkBase={linkBase} />
        </Card>
      ))}

      {view.divisions.some((d) => d.divisionWinner != null) &&
        (view.finals.matches.length > 0 || view.finals.teams.length > 0) && (
        <Card className="p-5 sm:p-6 space-y-4 ring-2 ring-primary/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="size-2 rounded-full bg-primary shadow-[0_0_12px_rgba(243,112,33,0.7)]" />
              <h2 className="text-lg font-semibold tracking-tight">Finals</h2>
              <span className="text-xs text-muted-foreground">
                {view.finals.locked ? "pool locked" : "pool open"}
                {view.finals.championTeam &&
                  ` · champion: ${view.finals.championTeam.name}`}
              </span>
            </div>
          </div>
          <DivisionBracket matches={view.finals.matches} linkBase={linkBase} />
        </Card>
        )}
    </div>
  );
}

function DivisionBracket({
  matches,
  linkBase,
}: {
  matches: CanvasMatch[];
  linkBase: string;
}) {
  if (matches.length === 0) {
    return (
      <p className="text-sm text-muted-foreground border border-dashed border-white/10 rounded-md p-4 text-center">
        No matches yet.
      </p>
    );
  }

  const byRound = new Map<number, CanvasMatch[]>();
  for (const m of matches) {
    const arr = byRound.get(m.round) ?? [];
    arr.push(m);
    byRound.set(m.round, arr);
  }
  const sorted = Array.from(byRound.entries()).sort(([a], [b]) => a - b);
  const total = sorted.length;

  const rounds = sorted.map(([, ms], idx) => ({
    title: roundTitle(idx + 1, total, ms),
    seeds: ms
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((m) => ({ id: m.id, match: m, href: `${linkBase}/${m.id}` })),
  }));

  return <BracketTree rounds={rounds} />;
}

function roundTitle(round: number, total: number, ms: CanvasMatch[]): string {
  if (ms.some((m) => m.isSeasonFinal)) return "Championship";
  if (ms.some((m) => m.isDivisionFinal)) return "Division Final";
  const fromEnd = total - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinals";
  if (fromEnd === 2) return "Quarterfinals";
  if (round === 1 && total === 1) return "Match";
  return round === 1 ? "Pool" : `Round ${round}`;
}
