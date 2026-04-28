import Link from "next/link";
import { db } from "@/db/client";
import { teams } from "@/db/schema";
import { buttonVariants } from "@/components/ui/button";
import { TeamCard } from "@/components/teams/TeamCard";
import { getSession } from "@/lib/session";

export default async function TeamsPage() {
  const session = (await getSession())!;
  const all = await db.select().from(teams).orderBy(teams.name);
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">League Teams</h1>
          <p className="text-muted-foreground">{all.length} registered teams</p>
        </div>
        {session.role === "admin" && (
          <Link href="/teams/new" className={buttonVariants({ className: "bg-primary hover:bg-primary/90 text-primary-foreground" })}>
            + Register Team
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {all.map((t) => <TeamCard key={t.id} team={t} />)}
      </div>
    </div>
  );
}
