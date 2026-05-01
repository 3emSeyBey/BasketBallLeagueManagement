"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Loader2, Check } from "lucide-react";
import { Card } from "@/components/ui/card";

type SaveState = "idle" | "saving" | "saved";

const DEBOUNCE_MS = 500;
const POLL_MS = 2000;

export function LiveScoreBoard({
  matchId,
  homeName,
  awayName,
  initialHome,
  initialAway,
  canEdit,
}: {
  matchId: number;
  homeName: string;
  awayName: string;
  initialHome: number;
  initialAway: number;
  canEdit: boolean;
}) {
  const [home, setHome] = useState(initialHome);
  const [away, setAway] = useState(initialAway);
  const [save, setSave] = useState<SaveState>("idle");
  const [matchEnded, setMatchEnded] = useState(false);
  const editable = canEdit && !matchEnded;

  const homeRef = useRef(home);
  const awayRef = useRef(away);
  homeRef.current = home;
  awayRef.current = away;

  // Persist to server.
  const persist = useCallback(
    async (next: { home?: number; away?: number }) => {
      setSave("saving");
      try {
        const body: Record<string, number> = {};
        if (next.home !== undefined) body.homeScore = next.home;
        if (next.away !== undefined) body.awayScore = next.away;
        const res = await fetch(`/api/matches/${matchId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("save failed");
        setSave("saved");
        window.setTimeout(() => setSave("idle"), 1200);
      } catch {
        setSave("idle");
      }
    },
    [matchId],
  );

  // Debounce manual edits.
  const debounceRef = useRef<number | null>(null);
  const scheduleSave = useCallback(
    (next: { home?: number; away?: number }) => {
      if (!editable) return;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        void persist(next);
      }, DEBOUNCE_MS);
    },
    [canEdit, persist],
  );

  // Realtime sync. Non-editors get full score sync; editors only watch status
  // so the board locks when an admin in another tab ends the match.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/matches/${matchId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.status === "ended") setMatchEnded(true);
        else setMatchEnded(false);
        if (!canEdit) {
          if (typeof data.homeScore === "number") setHome(data.homeScore);
          if (typeof data.awayScore === "number") setAway(data.awayScore);
        }
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
  }, [matchId, canEdit]);

  const bump = (side: "home" | "away", delta: number) => {
    if (!editable) return;
    if (side === "home") {
      const next = Math.max(0, home + delta);
      setHome(next);
      void persist({ home: next });
    } else {
      const next = Math.max(0, away + delta);
      setAway(next);
      void persist({ away: next });
    }
  };

  const onTypeChange = (side: "home" | "away", raw: string) => {
    const n = Math.max(0, Math.floor(Number(raw) || 0));
    if (side === "home") {
      setHome(n);
      scheduleSave({ home: n });
    } else {
      setAway(n);
      scheduleSave({ away: n });
    }
  };

  return (
    <Card className="p-6 sm:p-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <ScoreSide
          label={homeName}
          value={home}
          canEdit={editable}
          onType={(v) => onTypeChange("home", v)}
          onBump={(d) => bump("home", d)}
        />
        <div className="hidden sm:block text-3xl font-semibold text-muted-foreground text-center">
          —
        </div>
        <ScoreSide
          label={awayName}
          value={away}
          canEdit={editable}
          onType={(v) => onTypeChange("away", v)}
          onBump={(d) => bump("away", d)}
        />
      </div>
      {canEdit && matchEnded && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Match ended. Score is final and locked.
        </p>
      )}
      {editable && (
        <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
          {save === "saving" && (
            <>
              <Loader2 className="size-3 animate-spin" />
              <span>Saving…</span>
            </>
          )}
          {save === "saved" && (
            <>
              <Check className="size-3 text-emerald-400" />
              <span>Saved</span>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function ScoreSide({
  label,
  value,
  canEdit,
  onType,
  onBump,
}: {
  label: string;
  value: number;
  canEdit: boolean;
  onType: (v: string) => void;
  onBump: (delta: number) => void;
}) {
  return (
    <div className="space-y-3 text-center">
      <p className="text-sm font-medium text-muted-foreground truncate">{label}</p>
      {canEdit ? (
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={value}
          onChange={(e) => onType(e.target.value)}
          className="w-full bg-transparent text-center text-6xl font-semibold tracking-tight tabular-nums outline-none focus:text-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      ) : (
        <div className="text-6xl font-semibold tracking-tight tabular-nums">
          {value}
        </div>
      )}
      {canEdit && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => onBump(2)}
            className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-3 py-1.5 text-sm font-semibold text-primary ring-1 ring-primary/30 hover:bg-primary/25 transition-colors"
          >
            <Plus className="size-3.5" />2
          </button>
          <button
            type="button"
            onClick={() => onBump(3)}
            className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-3 py-1.5 text-sm font-semibold text-primary ring-1 ring-primary/30 hover:bg-primary/25 transition-colors"
          >
            <Plus className="size-3.5" />3
          </button>
          <button
            type="button"
            onClick={() => onBump(-1)}
            className="inline-flex items-center rounded-md bg-white/5 px-2 py-1.5 text-sm text-muted-foreground ring-1 ring-white/10 hover:bg-white/10 transition-colors"
            aria-label="Subtract 1"
          >
            −1
          </button>
        </div>
      )}
    </div>
  );
}
