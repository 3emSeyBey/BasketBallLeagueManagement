import Link from "next/link";
import { db } from "@/db/client";
import { teams, matches } from "@/db/schema";
import { Card } from "@/components/ui/card";

export default async function PublicHome() {
  const [t, m] = await Promise.all([
    db.select().from(teams),
    db.select().from(matches).orderBy(matches.scheduledAt).limit(5),
  ]);
  return (
    <div className="space-y-6">
      <div className="bg-primary/10 rounded-2xl p-10 text-center">
        <h1 className="text-4xl font-bold">Mayor&apos;s Cup Basketball League</h1>
        <p className="text-muted-foreground mt-2">Bantayan, Cebu — Season 2026</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-xs uppercase text-muted-foreground">Teams</p>
          <p className="text-3xl font-semibold">{t.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase text-muted-foreground">Matches</p>
          <p className="text-3xl font-semibold">{m.length}+</p>
        </Card>
        <Card className="p-5">
          <Link href="/public/schedule" className="text-primary">
            View schedule →
          </Link>
        </Card>
        <Card className="p-5">
          <Link href="/public/standings" className="text-primary">
            View standings →
          </Link>
        </Card>
      </div>
    </div>
  );
}
