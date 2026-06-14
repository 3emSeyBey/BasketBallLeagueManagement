"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Save, Star, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { computeBracketShape } from "@/lib/bracket-engine";
import { BracketGrid, type BracketBox } from "./BracketGrid";

type TeamRef = { id: number; name: string; hasLogo: boolean; color: string | null };

export type BracketData = {
  bracket: { id: number; title: string; isDefault: boolean; isPublished: boolean; divisionId: number };
  rounds: BracketBox[][];
  division: { id: number; name: string } | null;
  season: { id: number; name: string } | null;
  divisionTeams: TeamRef[];
};

type DraftBox = {
  uid: number;
  bracketMatchId: number | null;
  roundIndex: number;
  slotIndex: number;
  homeTeamId: number | null;
  awayTeamId: number | null;
  status: string;
  homeScore: number;
  awayScore: number;
  scheduledAt: string | null;
  venue: string | null;
};

let uidSeq = 1;
const newUid = () => uidSeq++;

function fromServer(rounds: BracketBox[][]): DraftBox[][] {
  return rounds.map((round) =>
    round.map((b) => ({
      uid: newUid(),
      bracketMatchId: b.bracketMatchId,
      roundIndex: b.roundIndex,
      slotIndex: b.slotIndex,
      homeTeamId: b.homeTeamId,
      awayTeamId: b.awayTeamId,
      status: b.status,
      homeScore: b.homeScore,
      awayScore: b.awayScore,
      scheduledAt: b.scheduledAt ?? null,
      venue: b.venue ?? null,
    })),
  );
}

function blankBox(roundIndex: number, slotIndex: number): DraftBox {
  return {
    uid: newUid(), bracketMatchId: null, roundIndex, slotIndex,
    homeTeamId: null, awayTeamId: null, status: "planned",
    homeScore: 0, awayScore: 0, scheduledAt: null, venue: null,
  };
}

// Re-derive the upper rounds from the round-1 list, preserving existing boxes by
// position so admin edits survive structural changes.
function derive(round1: DraftBox[], prev: DraftBox[][]): DraftBox[][] {
  const r0 = round1.map((b, i) => ({ ...b, roundIndex: 0, slotIndex: i }));
  const out: DraftBox[][] = [r0];
  const shape = computeBracketShape(r0.length);
  for (let r = 1; r < shape.length; r++) {
    const count = shape[r];
    const row: DraftBox[] = [];
    for (let i = 0; i < count; i++) {
      const existing = prev[r]?.[i];
      row.push(existing ? { ...existing, roundIndex: r, slotIndex: i } : blankBox(r, i));
    }
    out.push(row);
  }
  return out;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function BracketCanvas({ initial }: { initial: BracketData }) {
  const router = useRouter();
  const meta = initial.bracket;
  const teamMap = useMemo(() => new Map(initial.divisionTeams.map((t) => [t.id, t])), [initial.divisionTeams]);

  const [rounds, setRounds] = useState<DraftBox[][]>(() => fromServer(initial.rounds));
  const [title, setTitle] = useState(meta.title);
  const [isDefault, setIsDefault] = useState(meta.isDefault);
  const [published, setPublished] = useState(meta.isPublished);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [pick, setPick] = useState<{ r: number; i: number; slot: "home" | "away" } | null>(null);
  const [sched, setSched] = useState<{ r: number; i: number } | null>(null);
  const initialRef = useRef(initial.rounds);

  const id = meta.id;

  function commit(next: DraftBox[][]) {
    setRounds(next);
    setDirty(true);
  }

  function mutateBox(r: number, i: number, patch: Partial<DraftBox>) {
    const next = rounds.map((round, rr) =>
      round.map((box, ii) => (rr === r && ii === i ? { ...box, ...patch } : box)),
    );
    commit(next);
  }

  function addMatch() {
    const r0 = [...rounds[0], blankBox(0, rounds[0].length)];
    commit(derive(r0, rounds));
  }

  function removeMatch(r: number, i: number) {
    const box = rounds[r]?.[i];
    if (!box) return;
    if (r !== 0) { toast.error("Only round-1 matches can be removed"); return; }
    if (box.status !== "planned") { toast.error("Can't remove a match that has a result"); return; }
    const r0 = rounds[0].filter((_, ii) => ii !== i);
    commit(derive(r0, rounds));
  }

  function setSlot(r: number, i: number, slot: "home" | "away", teamId: number | null) {
    mutateBox(r, i, slot === "home" ? { homeTeamId: teamId } : { awayTeamId: teamId });
    setPick(null);
  }

  // New eligibility: a team is selectable unless it sits in an UNFINISHED match
  // and has no finished match yet. Once any of its matches has ended, it is
  // freely re-selectable (including within the same round it advanced to).
  const eligibleIds = useMemo(() => {
    const inUnfinished = new Set<number>();
    const hasEnded = new Set<number>();
    for (const round of rounds) {
      for (const b of round) {
        for (const tId of [b.homeTeamId, b.awayTeamId]) {
          if (tId == null) continue;
          if (b.status === "ended") hasEnded.add(tId);
          else inUnfinished.add(tId);
        }
      }
    }
    const set = new Set<number>();
    for (const t of initial.divisionTeams) {
      if (!inUnfinished.has(t.id) || hasEnded.has(t.id)) set.add(t.id);
    }
    return set;
  }, [rounds, initial.divisionTeams]);

  // Build the display rounds for BracketGrid from the draft + team lookup.
  const display: BracketBox[][] = useMemo(() => {
    const enrich = (tId: number | null) => {
      const t = tId != null ? teamMap.get(tId) : undefined;
      return { name: t?.name ?? null, logo: !!t?.hasLogo, color: t?.color ?? null };
    };
    return rounds.map((round) =>
      round.map((b) => {
        const h = enrich(b.homeTeamId);
        const a = enrich(b.awayTeamId);
        return {
          bracketMatchId: b.uid,
          matchId: 0,
          roundIndex: b.roundIndex,
          slotIndex: b.slotIndex,
          homeTeamId: b.homeTeamId,
          awayTeamId: b.awayTeamId,
          homeTeamName: h.name,
          awayTeamName: a.name,
          homeTeamLogo: h.logo,
          awayTeamLogo: a.logo,
          homeTeamColor: h.color,
          awayTeamColor: a.color,
          status: b.status,
          homeScore: b.homeScore,
          awayScore: b.awayScore,
          scheduledAt: b.scheduledAt,
          venue: b.venue,
          feedsIntoId: null,
        } satisfies BracketBox;
      }),
    );
  }, [rounds, teamMap]);

  function findByUid(uid: number): { r: number; i: number } | null {
    for (let r = 0; r < rounds.length; r++) {
      const i = rounds[r].findIndex((b) => b.uid === uid);
      if (i >= 0) return { r, i };
    }
    return null;
  }

  async function save() {
    setSaving(true);
    const payload = {
      title: title.trim() || "Bracket",
      isDefault,
      rounds: rounds.map((round) =>
        round.map((b) => ({
          bracketMatchId: b.bracketMatchId,
          homeTeamId: b.homeTeamId,
          awayTeamId: b.awayTeamId,
          scheduledAt: b.scheduledAt,
          venue: b.venue,
        })),
      ),
    };
    const res = await fetch(`/api/brackets/${id}/save`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Save failed");
      return;
    }
    const tree = await res.json();
    initialRef.current = tree.rounds;
    setRounds(fromServer(tree.rounds));
    setPublished(true);
    setDirty(false);
    toast.success("Saved & published");
    router.refresh();
  }

  function discard() {
    if (dirty && !confirm("Discard unsaved changes?")) return;
    setRounds(fromServer(initialRef.current));
    setTitle(meta.title);
    setIsDefault(meta.isDefault);
    setDirty(false);
  }

  async function removeBracket() {
    if (!confirm(`Delete bracket "${meta.title}"? This removes its matches.`)) return;
    const res = await fetch(`/api/brackets/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete failed"); return; }
    toast.success("Bracket deleted");
    router.push("/admin/brackets");
    router.refresh();
  }

  // slot picker data
  const pickBox = pick ? rounds[pick.r]?.[pick.i] : null;
  const currentTeamId = pickBox ? (pick!.slot === "home" ? pickBox.homeTeamId : pickBox.awayTeamId) : null;
  const pickerTeams: TeamRef[] = (() => {
    if (!pick) return [];
    const list = initial.divisionTeams.filter((t) => eligibleIds.has(t.id));
    if (currentTeamId != null && !list.some((t) => t.id === currentTeamId)) {
      const cur = teamMap.get(currentTeamId);
      if (cur) list.unshift(cur);
    }
    return list;
  })();

  const schedBox = sched ? rounds[sched.r]?.[sched.i] : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/brackets" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{initial.season?.name} · {initial.division?.name}</p>
          <div className="flex items-center gap-2">
            <Input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
              className="h-8 max-w-xs text-base font-semibold"
            />
            {published ? (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-600">Published</span>
            ) : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Draft</span>
            )}
            {dirty ? (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-600">Unsaved changes</span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isDefault ? "default" : "outline"}
            onClick={() => { setIsDefault((v) => !v); setDirty(true); }}
            title="New teams auto-join the default bracket"
          >
            <Star className="size-4" /> {isDefault ? "Default" : "Make default"}
          </Button>
          {dirty ? (
            <Button size="sm" variant="ghost" onClick={discard}>
              <Undo2 className="size-4" /> Discard
            </Button>
          ) : null}
          <Button size="sm" disabled={saving} onClick={save}>
            <Save className="size-4" /> {saving ? "Saving…" : "Save & Publish"}
          </Button>
          <Button size="sm" variant="destructive" onClick={removeBracket}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-muted/20 p-4">
        <BracketGrid
          rounds={display}
          editable
          onSlotClick={(box, slot) => {
            const at = findByUid(box.bracketMatchId);
            if (!at) return;
            if (rounds[at.r][at.i].status === "ended") { toast.error("This match already has a result"); return; }
            setPick({ ...at, slot });
          }}
          onAddMatch={addMatch}
          onEditMatch={(box) => { const at = findByUid(box.bracketMatchId); if (at) setSched(at); }}
          onRemoveMatch={(box) => { const at = findByUid(box.bracketMatchId); if (at) removeMatch(at.r, at.i); }}
        />
      </div>

      {/* Team picker */}
      <Dialog open={pick != null} onOpenChange={(o) => { if (!o) setPick(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select team</DialogTitle>
            <DialogDescription>
              Teams in an unfinished match are hidden until any of their games end.
            </DialogDescription>
          </DialogHeader>
          <Select
            value={currentTeamId != null ? String(currentTeamId) : ""}
            onValueChange={(v) => pick && setSlot(pick.r, pick.i, pick.slot, v ? Number(v) : null)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pick a team" />
            </SelectTrigger>
            <SelectContent>
              {pickerTeams.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">No eligible teams</div>
              ) : (
                pickerTeams.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)
              )}
            </SelectContent>
          </Select>
          <DialogFooter>
            {currentTeamId != null ? (
              <Button variant="outline" onClick={() => pick && setSlot(pick.r, pick.i, pick.slot, null)}>
                Clear slot
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule editor */}
      <Dialog open={sched != null} onOpenChange={(o) => { if (!o) setSched(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Match date &amp; time</DialogTitle>
          </DialogHeader>
          {schedBox ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Date &amp; time</Label>
                <Input
                  type="datetime-local"
                  value={toLocalInput(schedBox.scheduledAt)}
                  onChange={(e) => sched && mutateBox(sched.r, sched.i, { scheduledAt: fromLocalInput(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Venue</Label>
                <Input
                  value={schedBox.venue ?? ""}
                  placeholder="e.g. Bantayan Sports Complex"
                  onChange={(e) => sched && mutateBox(sched.r, sched.i, { venue: e.target.value || null })}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => sched && mutateBox(sched.r, sched.i, { scheduledAt: null, venue: null })}
            >
              Clear
            </Button>
            <Button onClick={() => setSched(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
