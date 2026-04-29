"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Team } from "@/db/schema";

type Props = { teams: Team[] };

export function CreateSeasonForm({ teams }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [allTeams, setAllTeams] = useState(true);
  const [thirdPlace, setThirdPlace] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(() => new Set(teams.map(t => t.id)));
  const [busy, setBusy] = useState(false);

  function toggle(id: number) {
    setSelected(curr => {
      const next = new Set(curr);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const teamIds = allTeams ? undefined : Array.from(selected);
    if (!allTeams && (teamIds?.length ?? 0) < 2) { toast.error("Pick at least 2 teams"); return; }
    setBusy(true);
    const res = await fetch("/api/seasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        startedAt: new Date(startedAt).toISOString(),
        teamIds,
        thirdPlaceMatch: thirdPlace,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Create failed");
      return;
    }
    const data = await res.json();
    router.push(`/admin/seasons/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2"><Label>Season name</Label><Input value={name} onChange={(e)=>setName(e.target.value)} required minLength={2} /></div>
        <div className="space-y-2"><Label>Start date</Label><Input type="datetime-local" value={startedAt} onChange={(e)=>setStartedAt(e.target.value)} required /></div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input id="all" type="checkbox" checked={allTeams} onChange={(e) => setAllTeams(e.target.checked)} />
          <Label htmlFor="all">Include all teams ({teams.length})</Label>
        </div>
        {!allTeams && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded-md p-3 max-h-64 overflow-y-auto">
            {teams.map(t => (
              <label key={t.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} />
                {t.name} <span className="text-muted-foreground">(Div {t.division})</span>
              </label>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input id="third" type="checkbox" checked={thirdPlace} onChange={(e) => setThirdPlace(e.target.checked)} />
          <Label htmlFor="third">Include third-place match</Label>
        </div>
      </div>
      <Button type="submit" disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">
        {busy ? "Creating…" : "Create season"}
      </Button>
    </form>
  );
}
