"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Pos = "PG" | "SG" | "SF" | "PF" | "C";

export function PlayerForm({ teamId }: { teamId: number }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [jersey, setJersey] = useState("");
  const [position, setPosition] = useState<Pos>("PG");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const res = await fetch("/api/players", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, name, jerseyNumber: Number(jersey), position }),
    });
    setBusy(false);
    if (!res.ok) { setErr("Save failed (jersey may already be taken)"); return; }
    setName(""); setJersey(""); setPosition("PG");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
      <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e)=>setName(e.target.value)} required /></div>
      <div className="space-y-2"><Label>Jersey #</Label><Input type="number" min={0} max={99} value={jersey} onChange={(e)=>setJersey(e.target.value)} required /></div>
      <div className="space-y-2"><Label>Position</Label>
        <Select value={position} onValueChange={(v)=>setPosition(v as Pos)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {["PG","SG","SF","PF","C"].map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">{busy?"Adding...":"+ Add Player"}</Button>
      {err && <p role="alert" className="col-span-full text-sm text-destructive">{err}</p>}
    </form>
  );
}
