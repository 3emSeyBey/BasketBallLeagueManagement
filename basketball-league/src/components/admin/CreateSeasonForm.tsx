"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Team } from "@/db/schema";

type Props = { teams: Team[] };

export function CreateSeasonForm({ teams: _teams }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/seasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        startedAt: new Date(startedAt).toISOString(),
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
        <div className="space-y-2"><Label>League name</Label><Input value={name} onChange={(e)=>setName(e.target.value)} required minLength={2} /></div>
        <div className="space-y-2"><Label>Start date</Label><Input type="datetime-local" value={startedAt} onChange={(e)=>setStartedAt(e.target.value)} required /></div>
      </div>
      <Button type="submit" disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">
        {busy ? "Creating…" : "Create league"}
      </Button>
    </form>
  );
}
