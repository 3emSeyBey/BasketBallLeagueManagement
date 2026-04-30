import Link from "next/link";
import { Volleyball } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Team } from "@/db/schema";

export function TeamCard({
  team,
  linkPrefix = "/teams",
  showDivision = true,
}: {
  team: Pick<Team, "id" | "name" | "division" | "imageMimeType" | "createdAt">;
  linkPrefix?: string;
  showDivision?: boolean;
}) {
  return (
    <Link href={`${linkPrefix}/${team.id}`}>
      <Card className="p-5 hover:border-primary transition-colors h-full">
        <div className="flex items-start justify-between">
          {team.imageMimeType ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/teams/${team.id}/image`}
              alt={team.name}
              className="size-12 rounded-lg object-cover ring-1 ring-white/10"
            />
          ) : (
            <span className="grid size-12 place-items-center rounded-lg bg-primary/10 ring-1 ring-primary/20 text-primary">
              <Volleyball className="size-6" />
            </span>
          )}
          {showDivision && <Badge variant="outline">{team.division}</Badge>}
        </div>
        <h3 className="font-semibold mt-4 truncate">{team.name}</h3>
        <p className="text-xs text-muted-foreground">
          Created {team.createdAt.slice(0, 10)}
        </p>
      </Card>
    </Link>
  );
}
