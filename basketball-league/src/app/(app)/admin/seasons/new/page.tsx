import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { seasons } from "@/db/schema";
import { getSession } from "@/lib/session";
import { CreateSeasonWizard } from "@/components/admin/CreateSeasonWizard";

export const dynamic = "force-dynamic";

export default async function NewSeasonPage() {
  const s = await getSession();
  if (s?.role !== "admin") redirect("/dashboard");

  // Any prior season can be a source to import divisions/teams/rosters from.
  const pastSeasons = await db
    .select({ id: seasons.id, name: seasons.name, status: seasons.status })
    .from(seasons)
    .orderBy(desc(seasons.id));

  return <CreateSeasonWizard pastSeasons={pastSeasons} />;
}
