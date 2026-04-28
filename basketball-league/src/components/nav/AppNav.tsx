import Link from "next/link";
import { Trophy } from "lucide-react";
import type { Role } from "@/lib/rbac";
import { LogoutButton } from "./LogoutButton";

const NAV_BY_ROLE: Record<Role, { href: string; label: string }[]> = {
  admin: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/teams", label: "Teams" },
    { href: "/schedule", label: "Schedule" },
    { href: "/standings", label: "Standings" },
    { href: "/admin/users", label: "Users" },
  ],
  team_manager: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/players", label: "Players" },
    { href: "/schedule", label: "Schedule" },
    { href: "/standings", label: "Standings" },
  ],
};

export function AppNav({ role }: { role: Role }) {
  const items = NAV_BY_ROLE[role];
  return (
    <header className="sticky top-0 z-40 bg-card border-b">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Trophy className="size-5 text-primary" />
          Basketball League
        </Link>
        <nav className="flex gap-6 text-sm">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className="hover:text-primary transition-colors">
              {i.label}
            </Link>
          ))}
        </nav>
        <LogoutButton />
      </div>
    </header>
  );
}
