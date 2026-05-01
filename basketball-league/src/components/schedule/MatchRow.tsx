import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Match, Team } from "@/db/schema";
import { effectiveMatchStatus, statusLabel } from "@/lib/match-status";

export function MatchRow({
  m,
  teamById,
  linkPrefix = "/schedule",
}: {
  m: Match;
  teamById: Map<number, Team>;
  linkPrefix?: string;
}) {
  const home = m.homeTeamId !== null ? teamById.get(m.homeTeamId) : undefined;
  const away = m.awayTeamId !== null ? teamById.get(m.awayTeamId) : undefined;
  const date = m.scheduledAt ? new Date(m.scheduledAt) : null;
  const status = effectiveMatchStatus(m.status, m.scheduledAt);
  const variant =
    status === "live"
      ? "default"
      : status === "ended"
        ? "secondary"
        : status === "started"
          ? "default"
          : "outline";
  const showScore = status === "live" || status === "ended" || status === "started";
  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="p-3 text-sm">{date ? date.toLocaleDateString() : "—"}</td>
      <td className="p-3 text-sm">
        {date
          ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "—"}
      </td>
      <td className="p-3 font-medium">
        {home?.name ?? "TBD"} vs {away?.name ?? "TBD"}
      </td>
      <td className="p-3 text-sm text-muted-foreground">{m.venue}</td>
      <td className="p-3">
        <Badge variant={variant}>{statusLabel(status)}</Badge>
      </td>
      <td className="p-3 text-sm">
        {showScore ? `${m.homeScore} - ${m.awayScore}` : "—"}
      </td>
      <td className="p-3">
        <Link href={`${linkPrefix}/${m.id}`} className="text-primary hover:underline">
          View
        </Link>
      </td>
    </tr>
  );
}
