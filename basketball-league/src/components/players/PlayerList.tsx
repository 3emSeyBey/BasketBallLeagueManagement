"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type RosterPlayer = {
  id: number;
  name: string;
  jerseyNumber: number;
  position: "PG" | "SG" | "SF" | "PF" | "C";
  height: string | null;
  imageMimeType: string | null;
};

export function PlayerList({ players }: { players: RosterPlayer[] }) {
  const router = useRouter();
  async function remove(e: React.MouseEvent, id: number) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Remove this player?")) return;
    await fetch(`/api/players/${id}`, { method: "DELETE" });
    router.refresh();
  }
  if (players.length === 0) return <p className="text-sm text-muted-foreground">No players yet — add your first above.</p>;
  return (
    <ul className="divide-y border rounded-md">
      {players.map(p => (
        <li key={p.id}>
          <Link
            href={`/players/${p.id}`}
            className="flex items-center justify-between p-3 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              {p.imageMimeType ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/players/${p.id}/image`} alt={p.name} className="size-10 rounded-full object-cover bg-muted" />
              ) : (
                <span className="size-10 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold text-sm">#{p.jerseyNumber}</span>
              )}
              <div className="space-y-0.5">
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">#{p.jerseyNumber} · {p.position}{p.height ? ` · ${p.height}` : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{p.position}</Badge>
              <Button variant="ghost" size="sm" onClick={(e)=>remove(e, p.id)}>Remove</Button>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
