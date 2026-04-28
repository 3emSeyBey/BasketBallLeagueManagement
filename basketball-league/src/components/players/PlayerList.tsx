"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Player } from "@/db/schema";

export function PlayerList({ players }: { players: Player[] }) {
  const router = useRouter();
  async function remove(id: number) {
    if (!confirm("Remove this player?")) return;
    await fetch(`/api/players/${id}`, { method: "DELETE" });
    router.refresh();
  }
  if (players.length === 0) return <p className="text-sm text-muted-foreground">No players yet — add your first above.</p>;
  return (
    <ul className="divide-y border rounded-md">
      {players.map(p => (
        <li key={p.id} className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <span className="size-8 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold">#{p.jerseyNumber}</span>
            <span className="font-medium">{p.name}</span>
            <Badge variant="outline">{p.position}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={()=>remove(p.id)}>Remove</Button>
        </li>
      ))}
    </ul>
  );
}
