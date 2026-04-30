import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { teamDivisions } from "@/db/schema";
import { getSession } from "@/lib/session";
import { TeamForm } from "@/components/teams/TeamForm";

export default async function NewTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ division?: string }>;
}) {
  const s = await getSession();
  if (s?.role !== "admin") redirect("/teams");
  const divs = await db
    .select()
    .from(teamDivisions)
    .orderBy(asc(teamDivisions.name));
  const sp = await searchParams;
  const presetDivision = sp.division && divs.some((d) => d.name === sp.division)
    ? sp.division
    : undefined;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Register Team</h1>
      <TeamForm
        divisions={divs.map((d) => d.name)}
        initial={presetDivision ? { division: presetDivision } : undefined}
      />
    </div>
  );
}
