import Link from "next/link";
import { Trophy } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function PublicNav() {
  return (
    <header className="sticky top-0 z-40 bg-card border-b">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Trophy className="size-5 text-primary" />
          Basketball League
        </Link>
        <nav className="flex gap-6 text-sm">
          <Link href="/" className="hover:text-primary transition-colors">
            Dashboard
          </Link>
          <Link href="/public/teams" className="hover:text-primary transition-colors">
            Teams
          </Link>
          <Link href="/public/schedule" className="hover:text-primary transition-colors">
            Schedule
          </Link>
          <Link href="/public/standings" className="hover:text-primary transition-colors">
            Standings
          </Link>
        </nav>
        <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Sign in
        </Link>
      </div>
    </header>
  );
}
