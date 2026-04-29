import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Match, Team } from "@/db/schema";

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
  const date = new Date(m.scheduledAt);
  const variant =
    m.status === "live" ? "default" : m.status === "final" ? "secondary" : "outline";
  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="p-3 text-sm">{date.toLocaleDateString()}</td>
      <td className="p-3 text-sm">
        {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </td>
      <td className="p-3 font-medium">
        {home?.name ?? "TBD"} vs {away?.name ?? "TBD"}
      </td>
      <td className="p-3 text-sm text-muted-foreground">{m.venue}</td>
      <td className="p-3">
        <Badge variant={variant}>{m.status}</Badge>
      </td>
      <td className="p-3 text-sm">
        {m.status === "scheduled" ? "—" : `${m.homeScore} - ${m.awayScore}`}
      </td>
      <td className="p-3">
        <Link href={`${linkPrefix}/${m.id}`} className="text-primary hover:underline">
          View
        </Link>
      </td>
    </tr>
  );
}
