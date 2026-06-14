"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Check, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BracketGrid, type BracketBox } from "./BracketGrid";

type TeamRef = { id: number; name: string };

export type BracketData = {
  bracket: { id: number; title: string; isDefault: boolean; isPublished: boolean; divisionId: number };
  rounds: BracketBox[][];
  division: { id: number; name: string } | null;
  season: { id: number; name: string } | null;
  divisionTeams: TeamRef[];
  eligibleTeams: TeamRef[];
};

export function BracketCanvas({ initial }: { initial: BracketData }) {
  const router = useRouter();
  const [data, setData] = useState<BracketData>(initial);
  const [title, setTitle] = useState(initial.bracket.title);
  const [busy, setBusy] = useState(false);

  // slot picker
  const [pick, setPick] = useState<{ box: BracketBox; slot: "home" | "away" } | null>(null);

  const b = data.bracket;
  const id = b.id;

  async function refresh() {
    const res = await fetch(`/api/brackets/${id}`, { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }

  async function patchBracket(body: Record<string, unknown>, ok?: string) {
    setBusy(true);
    const res = await fetch(`/api/brackets/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Update failed");
      return;
    }
    if (ok) toast.success(ok);
    await refresh();
    router.refresh();
  }

  async function addMatch() {
    setBusy(true);
    const res = await fetch(`/api/brackets/${id}/matches`, { method: "POST" });
    setBusy(false);
    if (!res.ok) { toast.error("Could not add match"); return; }
    await refresh();
  }

  async function setSlot(box: BracketBox, slot: "home" | "away", teamId: number | null) {
    const res = await fetch(`/api/brackets/${id}/matches/${box.bracketMatchId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot, teamId }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Could not set team");
      return;
    }
    setPick(null);
    await refresh();
  }

  async function removeBracket() {
    if (!confirm(`Delete bracket "${b.title}"? This removes its matches.`)) return;
    setBusy(true);
    const res = await fetch(`/api/brackets/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) { toast.error("Delete failed"); return; }
    toast.success("Bracket deleted");
    router.push("/admin/brackets");
    router.refresh();
  }

  // Teams offered in the picker: still-eligible teams, plus whichever team is
  // currently in this slot (so it shows as selected and can be kept).
  const currentTeamId = pick ? (pick.slot === "home" ? pick.box.homeTeamId : pick.box.awayTeamId) : null;
  const pickerTeams: TeamRef[] = (() => {
    if (!pick) return [];
    const list = [...data.eligibleTeams];
    if (currentTeamId != null && !list.some((t) => t.id === currentTeamId)) {
      const cur = data.divisionTeams.find((t) => t.id === currentTeamId);
      if (cur) list.unshift(cur);
    }
    return list;
  })();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/brackets" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">
            {data.season?.name} · {data.division?.name}
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => { if (title.trim() && title !== b.title) patchBracket({ title: title.trim() }); }}
              className="h-8 max-w-xs text-base font-semibold"
            />
            {b.isDefault ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-600">
                <Star className="size-3" /> Default
              </span>
            ) : null}
            {b.isPublished ? (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-600">Published</span>
            ) : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Draft</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!b.isDefault ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => patchBracket({ isDefault: true }, "Set as default")}>
              <Star className="size-4" /> Make default
            </Button>
          ) : null}
          <Button
            size="sm"
            variant={b.isPublished ? "outline" : "default"}
            disabled={busy}
            onClick={() => patchBracket({ isPublished: !b.isPublished }, b.isPublished ? "Unpublished" : "Published")}
          >
            <Check className="size-4" /> {b.isPublished ? "Unpublish" : "Publish"}
          </Button>
          <Button size="sm" variant="destructive" disabled={busy} onClick={removeBracket}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-muted/20 p-4">
        <BracketGrid
          rounds={data.rounds}
          editable
          onSlotClick={(box, slot) => setPick({ box, slot })}
          onAddMatch={addMatch}
        />
      </div>

      <Dialog open={pick != null} onOpenChange={(o) => { if (!o) setPick(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select team</DialogTitle>
            <DialogDescription>
              Teams already in an unfinished match are hidden until their game ends.
            </DialogDescription>
          </DialogHeader>
          <Select
            value={currentTeamId != null ? String(currentTeamId) : ""}
            onValueChange={(v) => pick && setSlot(pick.box, pick.slot, v ? Number(v) : null)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pick a team" />
            </SelectTrigger>
            <SelectContent>
              {pickerTeams.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">No eligible teams</div>
              ) : (
                pickerTeams.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <DialogFooter>
            {currentTeamId != null ? (
              <Button variant="outline" onClick={() => pick && setSlot(pick.box, pick.slot, null)}>
                Clear slot
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
