import Link from "next/link";
import { Card } from "@/components/ui/card";
import { LoginForm } from "./LoginForm";
import { listAnnouncements } from "@/lib/announcements-query";
import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const announcements = await listAnnouncements(3);

  return (
    <main className="min-h-dvh bg-muted px-4 py-10">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <Card className="p-8 space-y-6">
          <div className="space-y-1 text-center">
            <div className="text-3xl">🏀</div>
            <h1 className="text-2xl font-semibold">Basketball League</h1>
            <p className="text-sm text-muted-foreground">Sign in to continue</p>
          </div>
          <LoginForm />
          <p className="text-xs text-center text-muted-foreground">
            Public viewer? <Link href="/" className="text-primary underline">Browse without an account</Link>
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
