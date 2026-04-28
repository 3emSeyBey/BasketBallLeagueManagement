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

type Status = "scheduled" | "live" | "final";

export function ScoreForm({
  matchId,
  initial,
}: {
  matchId: number;
  initial: { home: number; away: number; status: Status };
}) {
  const router = useRouter();
  const [home, setHome] = useState(String(initial.home));
  const [away, setAway] = useState(String(initial.away));
  const [status, setStatus] = useState<Status>(initial.status);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homeScore: Number(home),
        awayScore: Number(away),
        status,
      }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
      <div className="space-y-2">
        <Label>Home Score</Label>
        <Input
          type="number"
          min={0}
          value={home}
          onChange={(e) => setHome(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Away Score</Label>
        <Input
          type="number"
          min={0}
          value={away}
          onChange={(e) => setAway(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="final">Final</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        onClick={save}
        disabled={busy}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {busy ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
