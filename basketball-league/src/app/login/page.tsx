import Link from "next/link";
import { Volleyball } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LoginForm } from "./LoginForm";
import { listAnnouncements } from "@/lib/announcements-query";
import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const announcements = await listAnnouncements(3);

  return (
    <main className="min-h-dvh px-4 py-10">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <Card className="p-8 space-y-6 ring-1 ring-white/10 shadow-2xl shadow-black/30 bg-card/70 backdrop-blur-xl">
          <div className="space-y-2 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/15 ring-1 ring-primary/30 shadow-lg shadow-primary/10">
              <Volleyball className="size-6 text-primary" />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">
              Basketball League
            </h1>
            <p className="text-sm text-muted-foreground">Sign in to continue</p>
          </div>
          <LoginForm />
          <p className="text-xs text-center text-muted-foreground">
            Public viewer?{" "}
            <Link href="/" className="text-primary underline-offset-4 hover:underline">
              Browse without an account
            </Link>
          </p>
        </Card>

        {announcements.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Latest announcements
            </h2>
            <div className="space-y-3">
              {announcements.map(a => (
                <AnnouncementCard key={a.id} announcement={a} linkBase="/public/announcements" />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
