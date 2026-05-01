"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { CanvasMatch } from "@/lib/season-bracket-query";

type Props = {
  match: CanvasMatch | null;
  onClose: () => void;
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function MatchPanel({ match, onClose }: Props) {
  if (!match) return null;
  return <MatchPanelInner match={match} onClose={onClose} />;
}

function MatchPanelInner({ match, onClose }: { match: CanvasMatch; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(() => toLocalInput(match.scheduledAt));
  const [venue, setVenue] = useState(match.venue);
  const [homeScore, setHomeScore] = useState(String(match.homeScore));
  const [awayScore, setAwayScore] = useState(String(match.awayScore));
  const [status, setStatus] = useState<"planned" | "scheduled" | "live" | "ended">(match.status as "planned" | "scheduled" | "live" | "ended");

  async function patchMatch(body: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch(`/api/matches/${match.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Save failed");
      return false;
    }
    return true;
  }

  async function saveSchedule() {
    const ok = await patchMatch({
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      venue,
    });
    if (ok) { toast.success("Schedule updated"); router.refresh(); }
  }

  async function saveScore() {
    const ok = await patchMatch({
      homeScore: Number(homeScore),
      awayScore: Number(awayScore),
      status,
    });
    if (ok) { toast.success("Score updated"); router.refresh(); }
  }

  async function toggleDivisionFinal() {
    setBusy(true);
    const method = match.isDivisionFinal ? "DELETE" : "POST";
    const res = await fetch(`/api/matches/${match.id}/division-final`, { method });
    setBusy(false);
    if (!res.ok) { toast.error("Update failed"); return; }
    router.refresh();
    onClose();
  }

  async function toggleSeasonFinal() {
    setBusy(true);
    const method = match.isSeasonFinal ? "DELETE" : "POST";
    const res = await fetch(`/api/matches/${match.id}/season-final`, { method });
    setBusy(false);
    if (!res.ok) { toast.error("Update failed"); return; }
    router.refresh();
    onClose();
  }

  async function promoteWinner(teamId: number) {
    const next = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    setBusy(true);
    const res = await fetch(`/api/matches/${match.id}/promote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        toRound: match.round + 1,
        scheduledAt: next,
        venue: match.venue,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Promote failed");
      return;
    }
    toast.success("Winner promoted to next round");
    router.refresh();
  }

  async function manuallyEliminate(teamId: number) {
    if (match.divisionId !== null) {
      toast.error("Manual elimination is only available in Finals");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/finals/${match.seasonId}/eliminate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId }),
    });
    setBusy(false);
    if (!res.ok) { toast.error("Elimination failed"); return; }
    toast.success("Team eliminated from Finals");
    router.refresh();
  }

  async function deleteMatch() {
    if (!confirm("Delete this match?")) return;
    setBusy(true);
    const res = await fetch(`/api/matches/${match.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) { toast.error("Delete failed"); return; }
    router.refresh();
    onClose();
  }

  const canPromoteHome = match.status === "ended" && match.homeScore > match.awayScore && match.homeTeam !== null;
  const canPromoteAway = match.status === "ended" && match.awayScore > match.homeScore && match.awayTeam !== null;

  return (
    <Dialog open={true} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {match.homeTeam?.name ?? "TBD"} vs {match.awayTeam?.name ?? "TBD"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <section className="space-y-2">
            <h3 className="text-sm font-medium">Schedule</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">When</Label>
                <Input type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Venue</Label>
                <Input value={venue} onChange={e=>setVenue(e.target.value)} />
              </div>
            </div>
            <Button size="sm" onClick={saveSchedule} disabled={busy}>Save schedule</Button>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Score &amp; status</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Home</Label>
                <Input type="number" min={0} value={homeScore} onChange={e=>setHomeScore(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Away</Label>
                <Input type="number" min={0} value={awayScore} onChange={e=>setAwayScore(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <select
                  className="h-8 w-full rounded-lg border border-input bg-transparent text-sm px-2"
                  value={status}
                  onChange={e=>setStatus(e.target.value as "planned" | "scheduled" | "live" | "ended")}
                >
                  <option value="planned">planned</option>
                  <option value="scheduled">scheduled</option>
                  <option value="live">live</option>
                  <option value="ended">ended</option>
                </select>
              </div>
            </div>
            <Button size="sm" onClick={saveScore} disabled={busy}>Save score</Button>
          </section>

          {match.status === "ended" && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium">Advance winner</h3>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" disabled={busy || !canPromoteHome} onClick={()=>match.homeTeam && promoteWinner(match.homeTeam.id)}>
                  Promote {match.homeTeam?.name ?? "home"}
                </Button>
                <Button size="sm" variant="outline" disabled={busy || !canPromoteAway} onClick={()=>match.awayTeam && promoteWinner(match.awayTeam.id)}>
                  Promote {match.awayTeam?.name ?? "away"}
                </Button>
              </div>
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Flags</h3>
            <div className="flex gap-2 flex-wrap">
              {match.divisionId !== null && (
                <Button size="sm" variant={match.isDivisionFinal ? "default" : "outline"} onClick={toggleDivisionFinal} disabled={busy}>
                  {match.isDivisionFinal ? "Unmark division final" : "Mark as division final"}
                </Button>
              )}
              <Button size="sm" variant={match.isSeasonFinal ? "default" : "outline"} onClick={toggleSeasonFinal} disabled={busy}>
                {match.isSeasonFinal ? "Unmark season final" : "Mark as season final"}
              </Button>
            </div>
          </section>

          {match.divisionId === null && match.status === "ended" && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium">Finals override</h3>
              <p className="text-xs text-muted-foreground">Permanently eliminate the loser of this match.</p>
              <div className="flex gap-2 flex-wrap">
                {match.homeTeam && (
                  <Button size="sm" variant="destructive" disabled={busy} onClick={()=>manuallyEliminate(match.homeTeam!.id)}>
                    Eliminate {match.homeTeam.name}
                  </Button>
                )}
                {match.awayTeam && (
                  <Button size="sm" variant="destructive" disabled={busy} onClick={()=>manuallyEliminate(match.awayTeam!.id)}>
                    Eliminate {match.awayTeam.name}
                  </Button>
                )}
              </div>
            </section>
          )}
        </div>

        <DialogFooter>
          <Button variant="destructive" onClick={deleteMatch} disabled={busy}>Delete match</Button>
          <DialogClose render={<Button variant="outline" disabled={busy} />}>Close</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
