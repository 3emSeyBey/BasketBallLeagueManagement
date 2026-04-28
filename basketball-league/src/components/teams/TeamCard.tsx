import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Team } from "@/db/schema";

export function TeamCard({ team, linkPrefix = "/teams" }: { team: Team; linkPrefix?: string }) {
  return (
    <Link href={`${linkPrefix}/${team.id}`}>
      <Card className="p-5 hover:border-primary transition-colors h-full">
        <div className="flex items-start justify-between">
          <div className="size-12 rounded-lg bg-muted grid place-items-center text-xl">🏀</div>
          <Badge variant="outline">Div {team.division}</Badge>
        </div>
        <h3 className="font-semibold mt-4">{team.name}</h3>
        <p className="text-xs text-muted-foreground">Created {team.createdAt.slice(0, 10)}</p>
      </Card>
    </Link>
  );
}
