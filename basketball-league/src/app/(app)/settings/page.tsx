import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowRight, Sparkles } from "lucide-react";
import { db } from "@/db/client";
import { seasons, users } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/session";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { StartSeasonButton } from "@/components/settings/StartSeasonButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });
  if (!me) redirect("/login");

  const activeSeason =
    session.role === "admin"
      ? await db.query.seasons.findFirst({
          where: eq(seasons.status, "active"),
        })
      : null;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          {session.role === "admin"
            ? "Account, season, and league administration"
            : "Update your account details"}
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Profile</h2>
        <ProfileForm
          initial={{
            email: me.email,
            username: me.username ?? "",
            name: me.name ?? "",
            contactNumber: me.contactNumber ?? "",
          }}
          showUsername
          showContact={session.role !== "admin" ? true : true}
        />
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Change password</h2>
        <ChangePasswordForm />
      </Card>

      {session.role === "admin" && (
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="font-semibold">Season management</h2>
            <p className="text-sm text-muted-foreground">
              {activeSeason
                ? `Active season: ${activeSeason.name}`
                : "No active season."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeSeason ? (
              <Link
                href={`/admin/seasons/${activeSeason.id}`}
                className={buttonVariants({
                  variant: "outline",
                  className: "gap-2",
                })}
              >
                Manage current season
                <ArrowRight className="size-4" />
              </Link>
            ) : (
              <Link
                href="/admin/seasons"
                className={buttonVariants({
                  variant: "outline",
                  className: "gap-2",
                })}
              >
                View all seasons
                <ArrowRight className="size-4" />
              </Link>
            )}
            <StartSeasonButton />
          </div>
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Sparkles className="size-3" />
            New seasons start in draft. Add divisions and teams next.
          </p>
        </Card>
      )}
    </div>
  );
}
