"use client";
import { useState } from "react";
import Link from "next/link";
import { Trophy, Menu, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

const items = [
  { href: "/", label: "Dashboard" },
  { href: "/public/teams", label: "Teams" },
  { href: "/public/schedule", label: "Schedule" },
  { href: "/public/standings", label: "Standings" },
];

export function PublicNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-card border-b">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold shrink-0"
          onClick={() => setOpen(false)}
        >
          <Trophy className="size-5 text-primary" />
          <span className="hidden sm:inline">Basketball League</span>
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
        <Link
          href="/login"
          className={`hidden md:inline-flex ${buttonVariants({ variant: "outline", size: "sm" })}`}
        >
          Sign in
        </Link>
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
        <div className="md:hidden border-t bg-card">
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
              href="/login"
              className={`mt-2 ${buttonVariants({ variant: "outline", size: "sm" })}`}
              onClick={() => setOpen(false)}
            >
              Sign in
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
