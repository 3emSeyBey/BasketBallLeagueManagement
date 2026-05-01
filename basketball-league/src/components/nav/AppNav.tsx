"use client";
import { useState } from "react";
import Link from "next/link";
import { Trophy, Menu, X } from "lucide-react";
import type { Role } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "./LogoutButton";
import { UserMenu } from "./UserMenu";

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

export function AppNav({ role, username }: { role: Role; username: string }) {
  const items = NAV_BY_ROLE[role];
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold shrink-0"
          onClick={() => setOpen(false)}
        >
          <span className="grid size-8 place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <Trophy className="size-4 text-primary" />
          </span>
          <span className="hidden sm:inline bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Basketball League
          </span>
          <span className="sm:hidden">League</span>
        </Link>
        <nav className="hidden md:flex gap-6 text-sm">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className="hover:text-primary transition-colors"
            >
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <UserMenu username={username} />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>
      {open && (
        <div className="md:hidden border-t border-white/5 bg-background/80 backdrop-blur-xl">
          <nav className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-1">
            {items.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className="py-2 px-2 rounded-md hover:bg-muted text-sm"
                onClick={() => setOpen(false)}
              >
                {i.label}
              </Link>
            ))}
            <Link
              href="/settings"
              className="py-2 px-2 rounded-md hover:bg-muted text-sm flex items-center gap-2"
              onClick={() => setOpen(false)}
            >
              Settings
            </Link>
            <div className="pt-2 border-t mt-1 flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground px-2">@{username}</span>
              <LogoutButton />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
