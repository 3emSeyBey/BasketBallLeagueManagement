import type { StandingRow } from "@/lib/standings";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StandingsTable({
  title,
  rows,
  highlightTeamId,
}: {
  title: string;
  rows: StandingRow[];
  highlightTeamId?: number | null;
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-primary">{title}</h2>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[640px]">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Pos</th><th className="p-3">Team</th>
              <th className="p-3 text-center">GP</th><th className="p-3 text-center">W</th>
              <th className="p-3 text-center">L</th><th className="p-3 text-center">PF</th>
              <th className="p-3 text-center">PA</th><th className="p-3 text-center">+/-</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const mine = highlightTeamId === r.teamId;
              return (
                <tr
                  key={r.teamId}
                  className={cn("border-b", mine && "bg-primary/10 font-medium")}
                >
                  <td className="p-3 font-semibold">{i+1}</td>
                  <td className="p-3">
                    {r.teamName}
                    {mine && <span className="ml-2 text-xs text-primary">(you)</span>}
                  </td>
                  <td className="p-3 text-center tabular-nums">{r.gamesPlayed}</td>
                  <td className="p-3 text-center tabular-nums">{r.wins}</td>
                  <td className="p-3 text-center tabular-nums">{r.losses}</td>
                  <td className="p-3 text-center tabular-nums">{r.pointsFor}</td>
                  <td className="p-3 text-center tabular-nums">{r.pointsAgainst}</td>
                  <td className="p-3 text-center tabular-nums">{r.pointDiff > 0 ? "+" : ""}{r.pointDiff}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
}
