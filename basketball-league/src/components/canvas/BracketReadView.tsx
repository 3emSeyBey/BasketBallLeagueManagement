"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MatchCard } from "./MatchCard";
import type { CanvasView, CanvasMatch } from "@/lib/season-bracket-query";

/**
 * Read-only renderer for the season bracket canvas. Used on the public
 * standings page and other non-admin surfaces.
 */
export function BracketReadView({ view }: { view: CanvasView }) {
  return (
    <div className="space-y-6">
      {view.divisions.map(d => (
        <Card key={d.id} className="p-5 space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">{d.name}</h2>
            <span className="text-xs text-muted-foreground">
              {d.teams.length} teams · {d.locked ? "pool locked" : "pool open"}
              {d.divisionWinner && ` · winner: ${d.divisionWinner.name}`}
            </span>
          </div>
          {d.teams.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {d.teams.map(t => (
                <Badge key={t.team.id} variant={t.status === "permanent_eliminated" ? "outline" : "secondary"}>
                  {t.team.name}
                  {t.status === "permanent_eliminated" && <span className="ml-1 line-through opacity-60">✗</span>}
                </Badge>
              ))}
            </div>
          )}
          <Columns matches={d.matches} />
        </Card>
      ))}

      {(view.finals.matches.length > 0 || view.finals.teams.length > 0) && (
        <Card className="p-5 space-y-3 ring-2 ring-primary/30">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">Finals</h2>
            <span className="text-xs text-muted-foreground">
              {view.finals.locked ? "pool locked" : "pool open"}
              {view.finals.championTeam && ` · champion: ${view.finals.championTeam.name}`}
            </span>
          </div>
          <Columns matches={view.finals.matches} />
        </Card>
      )}
    </div>
  );
}

function Columns({ matches }: { matches: CanvasMatch[] }) {
  if (matches.length === 0) return <p className="text-xs text-muted-foreground">No matches yet.</p>;
  const byCol = new Map<number, CanvasMatch[]>();
  for (const m of matches) {
    const c = m.round;
    if (!byCol.has(c)) byCol.set(c, []);
    byCol.get(c)!.push(m);
  }
  const cols = Array.from(byCol.keys()).sort((a, b) => a - b);
  const total = cols.length > 0 ? cols[cols.length - 1] : 1;
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-3 min-w-fit pb-1">
        {cols.map(c => (
          <div key={c} className="w-56 shrink-0 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{title(c, total)}</p>
            <div className="space-y-2">
              {(byCol.get(c) ?? []).map(m => <MatchCard key={m.id} match={m} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function title(round: number, total: number): string {
  if (round === 1) return "Pool";
  const fromEnd = total - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinals";
  return `Round ${round}`;
}
