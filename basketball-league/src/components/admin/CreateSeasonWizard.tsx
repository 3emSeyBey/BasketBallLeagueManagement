"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type PastSeason = { id: number; name: string; status: string };
type SrcTeam = { teamId: number; name: string; playerCount: number; managerName: string | null };
type SrcDiv = { divisionId: number; divisionName: string; teams: SrcTeam[] };

export function CreateSeasonWizard({ pastSeasons }: { pastSeasons: PastSeason[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [tree, setTree] = useState<SrcDiv[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [teamSel, setTeamSel] = useState<Set<number>>(new Set());
  const [rosterSel, setRosterSel] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  async function pickSource(v: string | null) {
    const id = v ?? "";
    setSourceId(id);
    setTree([]);
    setTeamSel(new Set());
    setRosterSel(new Set());
    if (!id) return;
    setLoadingTree(true);
    const res = await fetch(`/api/seasons/${id}/import-source`, { cache: "no-store" });
    setLoadingTree(false);
    if (res.ok) setTree(await res.json());
  }

  const allTeamIds = tree.flatMap((d) => d.teams.map((t) => t.teamId));
  const allSelected = allTeamIds.length > 0 && allTeamIds.every((id) => teamSel.has(id));

  function setSelectAll(on: boolean) {
    setTeamSel(on ? new Set(allTeamIds) : new Set());
    if (!on) setRosterSel(new Set());
  }
  function toggleTeam(id: number) {
    setTeamSel((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    setRosterSel((p) => { if (p.has(id)) { const n = new Set(p); n.delete(id); return n; } return p; });
  }
  function toggleDiv(d: SrcDiv, on: boolean) {
    setTeamSel((p) => { const n = new Set(p); for (const t of d.teams) { if (on) n.add(t.teamId); else n.delete(t.teamId); } return n; });
    if (!on) setRosterSel((p) => { const n = new Set(p); for (const t of d.teams) n.delete(t.teamId); return n; });
  }
  function toggleRoster(id: number) {
    setRosterSel((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    setTeamSel((p) => (p.has(id) ? p : new Set(p).add(id))); // including roster implies the team
  }

  async function create() {
    if (name.trim().length < 2) { toast.error("Season name needs at least 2 characters"); return; }
    setBusy(true);
    const body: Record<string, unknown> = { name: name.trim() };
    if (sourceId && teamSel.size > 0) {
      body.import = {
        sourceSeasonId: Number(sourceId),
        teams: [...teamSel].map((id) => ({ teamId: id, includeRoster: rosterSel.has(id) })),
      };
    }
    const res = await fetch("/api/seasons", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Could not create season");
      return;
    }
    const { id } = await res.json();
    toast.success("Season created as draft");
    router.push(`/admin/seasons/${id}`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/seasons" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-semibold">New season</h1>
          <p className="text-sm text-muted-foreground">Created as a draft — set the start date when you activate it.</p>
        </div>
      </div>

      <Card className="space-y-2 p-6">
        <Label htmlFor="season-name">Season name</Label>
        <Input id="season-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Season 2027" maxLength={80} autoFocus />
      </Card>

      <Card className="space-y-4 p-6">
        <div>
          <h2 className="font-semibold">Import from a past season <span className="text-sm font-normal text-muted-foreground">(optional)</span></h2>
          <p className="text-sm text-muted-foreground">Copy divisions, teams, and their rosters. Managers carry over with their team.</p>
        </div>

        <div className="flex items-center gap-3">
          <Label className="text-sm text-muted-foreground">Copy from</Label>
          <Select value={sourceId} onValueChange={pickSource}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a season">
                {(v: string) => pastSeasons.find((s) => String(s.id) === v)?.name ?? "Select a season"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {pastSeasons.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name} · {s.status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loadingTree && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</p>
        )}

        {tree.length > 0 && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" className="size-4 accent-primary" checked={allSelected} onChange={(e) => setSelectAll(e.target.checked)} />
              Select all
            </label>
            <div className="divide-y rounded-md border">
              {tree.map((d) => {
                const divChecked = d.teams.length > 0 && d.teams.every((t) => teamSel.has(t.teamId));
                return (
                  <div key={d.divisionId} className="p-3">
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <input type="checkbox" className="size-4 accent-primary" checked={divChecked} onChange={(e) => toggleDiv(d, e.target.checked)} />
                      {d.divisionName}
                      <span className="text-xs font-normal text-muted-foreground">{d.teams.length} teams</span>
                    </label>
                    <div className="mt-1.5 space-y-1 pl-6">
                      {d.teams.map((t) => (
                        <div key={t.teamId} className="flex flex-wrap items-center gap-2 text-sm">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" className="size-4 accent-primary" checked={teamSel.has(t.teamId)} onChange={() => toggleTeam(t.teamId)} />
                            {t.name}
                          </label>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="size-3" />{t.playerCount}
                            {t.managerName ? ` · ${t.managerName}` : ""}
                          </span>
                          <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                            <input type="checkbox" className="size-3.5 accent-primary" checked={rosterSel.has(t.teamId)} onChange={() => toggleRoster(t.teamId)} />
                            include roster
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Link href="/admin/seasons" className="text-sm text-muted-foreground hover:text-foreground">Cancel</Link>
        <Button onClick={create} disabled={busy || name.trim().length < 2}>
          {busy ? "Creating…" : "Create season"}
        </Button>
      </div>
    </div>
  );
}
