import Link from "next/link";
import { asc } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/db/client";
import { teams, teamDivisions } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { TeamCard } from "@/components/teams/TeamCard";
import { AddDivisionDialog } from "@/components/divisions/AddDivisionDialog";
import { DivisionTitle } from "@/components/divisions/DivisionTitle";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const session = (await getSession())!;
  const isAdmin = session.role === "admin";

  const [allTeams, divs] = await Promise.all([
    db.select().from(teams).orderBy(asc(teams.name)),
    db.select().from(teamDivisions).orderBy(asc(teamDivisions.name)),
  ]);

  // Group teams by division name. Divisions without rows still render.
  const grouped = new Map<string, typeof allTeams>(
    divs.map((d) => [d.name, []]),
  );
  for (const t of allTeams) {
    if (!grouped.has(t.division)) grouped.set(t.division, []);
    grouped.get(t.division)!.push(t);
  }
  const divByName = new Map(divs.map((d) => [d.name, d]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">League Teams</h1>
          <p className="text-muted-foreground">
            {allTeams.length} teams across {divs.length} division
            {divs.length === 1 ? "" : "s"}
            {isAdmin && (
              <>
                {" "}
                · <span className="text-xs">Double-click a division name to rename</span>
              </>
            )}
          </p>
        </div>
        {isAdmin && <AddDivisionDialog />}
      </div>

      {grouped.size === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <p>No divisions yet.</p>
          {isAdmin && <p className="text-sm mt-1">Add a division to get started.</p>}
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([divName, list]) => {
            const div = divByName.get(divName);
            return (
              <Card key={divName} className="p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="size-2 rounded-full bg-primary shadow-[0_0_12px_rgba(243,112,33,0.7)]" />
                    {div ? (
                      <DivisionTitle
                        id={div.id}
                        name={divName}
                        canEdit={isAdmin}
                      />
                    ) : (
                      <h2 className="text-xl font-semibold tracking-tight">
                        {divName}
                      </h2>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {list.length} team{list.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {isAdmin && (
                    <Link
                      href={`/teams/new?division=${encodeURIComponent(divName)}`}
                      className={buttonVariants({
                        size: "sm",
                        className:
                          "bg-primary text-primary-foreground hover:bg-primary/90",
                      })}
                    >
                      <Plus className="size-4 mr-1.5" />
                      Register Team
                    </Link>
                  )}
                </div>
                {list.length === 0 ? (
                  <p className="text-sm text-muted-foreground border border-dashed rounded-md p-4 text-center">
                    No teams in this division yet.
                    {isAdmin && (
                      <>
                        {" "}
                        <Link
                          href={`/teams/new?division=${encodeURIComponent(divName)}`}
                          className="text-primary hover:underline"
                        >
                          Register the first team
                        </Link>
                        .
                      </>
                    )}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {list.map((t) => (
                      <TeamCard key={t.id} team={t} showDivision={false} />
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
