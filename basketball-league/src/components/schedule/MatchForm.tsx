"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Team } from "@/db/schema";

export function MatchForm({
  teams,
  seasonId,
}: {
  teams: Team[];
  seasonId: number;
}) {
  const router = useRouter();
  const [home, setHome] = useState<string>("");
  const [away, setAway] = useState<string>("");
  const [when, setWhen] = useState("");
  const [venue, setVenue] = useState("Bantayan Sports Complex");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seasonId,
        homeTeamId: Number(home),
        awayTeamId: Number(away),
        scheduledAt: new Date(when).toISOString(),
        venue,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setErr("Create failed");
      return;
    }
    router.push("/schedule");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      <div className="space-y-2">
        <Label>Home Team</Label>
        <Select value={home} onValueChange={(v) => setHome(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Select team" />
          </SelectTrigger>
          <SelectContent>
            {teams.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Away Team</Label>
        <Select value={away} onValueChange={(v) => setAway(v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Select team" />
          </SelectTrigger>
          <SelectContent>
            {teams
              .filter((t) => String(t.id) !== home)
              .map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>When</Label>
        <Input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Venue</Label>
        <Input
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          required
        />
      </div>
      {err && (
        <p role="alert" className="text-sm text-destructive">
          {err}
        </p>
      )}
      <Button
        type="submit"
        disabled={busy || !home || !away || home === away}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {busy ? "Creating..." : "Create Match"}
      </Button>
    </form>
  );
}
