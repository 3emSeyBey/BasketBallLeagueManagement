"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type TeamOption = { id: number; name: string; status?: string };

type Props = {
  seasonId: number;
  divisionId: number | null; // null for Finals
  stage: "pool" | "playoff" | "final";
  round: number;
  triggerLabel: string;
  teamOptions: TeamOption[];
};

function toLocalInput(): string {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function AddMatchDialog({ seasonId, divisionId, stage, round, triggerLabel, teamOptions }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [homeId, setHomeId] = useState("");
  const [awayId, setAwayId] = useState("");
  const [scheduledAt, setScheduledAt] = useState(() => toLocalInput());
  const [venue, setVenue] = useState("Bantayan Sports Complex");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/seasons/${seasonId}/matches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        divisionId,
        stage,
        round,
        homeTeamId: homeId ? Number(homeId) : null,
        awayTeamId: awayId ? Number(awayId) : null,
        scheduledAt: new Date(scheduledAt).toISOString(),
        venue,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Create failed");
      return;
    }
    toast.success("Match added");
    setOpen(false);
    setHomeId(""); setAwayId("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>{triggerLabel}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add match</DialogTitle>
          <DialogDescription>Pick the participants and schedule.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-2">
              <Label>Home team</Label>
              <Select value={homeId} onValueChange={(v)=>setHomeId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick a team (optional)">
                    {(v: string) => {
                      if (!v) return null;
                      return teamOptions.find(t => String(t.id) === v)?.name ?? null;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {teamOptions.map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}{t.status === "tentative_eliminated" ? " (revivable)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Away team</Label>
              <Select value={awayId} onValueChange={(v)=>setAwayId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick a team (optional)">
                    {(v: string) => {
                      if (!v) return null;
                      return teamOptions.find(t => String(t.id) === v)?.name ?? null;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {teamOptions.map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}{t.status === "tentative_eliminated" ? " (revivable)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scheduled at</Label>
              <Input type="datetime-local" value={scheduledAt} onChange={(e)=>setScheduledAt(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Venue</Label>
              <Input value={venue} onChange={(e)=>setVenue(e.target.value)} required minLength={2} maxLength={120} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" disabled={busy} />}>Cancel</DialogClose>
            <Button type="submit" disabled={busy}>{busy ? "Adding…" : "Add match"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
