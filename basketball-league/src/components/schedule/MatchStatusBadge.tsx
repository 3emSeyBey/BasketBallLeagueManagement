"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  effectiveMatchStatus,
  statusLabel,
  type MatchStatus,
} from "@/lib/match-status";

const POLL_MS = 2000;

export function MatchStatusBadge({
  matchId,
  initialStatus,
  initialScheduledAt,
}: {
  matchId: number;
  initialStatus: MatchStatus;
  initialScheduledAt: string | null;
}) {
  const [stored, setStored] = useState<MatchStatus>(initialStatus);
  const [scheduledAt, setScheduledAt] = useState<string | null>(initialScheduledAt);
  const [now, setNow] = useState<Date>(() => new Date());

  // Poll the match for status/schedule changes.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/matches/${matchId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (typeof data.status === "string") setStored(data.status as MatchStatus);
        if ("scheduledAt" in data) setScheduledAt(data.scheduledAt ?? null);
        setNow(new Date());
      } catch {
        // ignore
      }
    };
    void tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [matchId]);

  // Re-tick wall-clock every 30s so derived "started" flips when the hour changes.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const status = effectiveMatchStatus(stored, scheduledAt, now);
  return (
    <Badge
      className={cn(
        status === "live" && "bg-red-500/20 text-red-300 ring-red-500/40",
        status === "started" && "bg-amber-500/20 text-amber-300 ring-amber-500/40",
        status === "ended" && "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40",
      )}
    >
      {status === "live" && (
        <span className="mr-1.5 inline-flex size-1.5 rounded-full bg-red-400 animate-pulse" />
      )}
      {statusLabel(status)}
    </Badge>
  );
}
