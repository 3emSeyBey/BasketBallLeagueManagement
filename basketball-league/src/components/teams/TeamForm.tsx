"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Initial = { name?: string; division?: "A" | "B"; logoUrl?: string | null };

export function TeamForm({ id, initial }: { id?: number; initial?: Initial }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [division, setDivision] = useState<"A" | "B">(initial?.division ?? "A");
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const url = id ? `/api/teams/${id}` : "/api/teams";
    const res = await fetch(url, {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, division, logoUrl: logoUrl || undefined }),
    });
    setBusy(false);
    if (!res.ok) { setErr("Save failed"); return; }
    router.push("/teams"); router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      <div className="space-y-2"><Label>Team name</Label><Input value={name} onChange={(e)=>setName(e.target.value)} required minLength={2} /></div>
      <div className="space-y-2">
        <Label>Division</Label>
        <Select value={division} onValueChange={(v)=>setDivision(v as "A"|"B")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="A">Division A</SelectItem>
            <SelectItem value="B">Division B</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label>Logo URL (optional)</Label><Input value={logoUrl ?? ""} onChange={(e)=>setLogoUrl(e.target.value)} /></div>
      {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
      <Button type="submit" disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">{busy?"Saving...":"Save"}</Button>
    </form>
  );
}
