"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Initial = { name?: string; division?: "A" | "B" };
type Manager = { id: number; email: string; name?: string | null };

function managerLabel(m: Manager): string {
  return m.name && m.name.trim() ? `${m.name} (${m.email})` : m.email;
}

export function TeamForm({
  id,
  initial,
  unassignedManagers: initialManagers = [],
}: {
  id?: number;
  initial?: Initial;
  unassignedManagers?: Manager[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [division, setDivision] = useState<"A" | "B">(initial?.division ?? "A");
  const [managerId, setManagerId] = useState<string>("");
  const [managers, setManagers] = useState<Manager[]>(initialManagers);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isCreate = !id;
  const noManagers = managers.length === 0;

  const refreshManagers = useCallback(async () => {
    try {
      const res = await fetch("/api/users/managers/unassigned", { cache: "no-store" });
      if (!res.ok) return;
      const data: Manager[] = await res.json();
      setManagers(data);
      if (managerId && !data.some(m => String(m.id) === managerId)) setManagerId("");
    } catch {}
  }, [managerId]);

  useEffect(() => {
    if (!isCreate) return;
    let cancelled = false;
    const run = async () => {
      const res = await fetch("/api/users/managers/unassigned", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data: Manager[] = await res.json();
      if (cancelled) return;
      setManagers(data);
    };
    void run();
    const onFocus = () => { void run(); };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [isCreate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    if (isCreate && !managerId) { setBusy(false); setErr("Pick a manager"); return; }
    const url = id ? `/api/teams/${id}` : "/api/teams";
    const body: Record<string, unknown> = { name, division };
    if (isCreate) body.managerId = Number(managerId);
    const res = await fetch(url, {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Save failed");
      return;
    }
    router.push("/teams"); router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      <div className="space-y-2">
        <Label>Team name</Label>
        <Input value={name} onChange={(e)=>setName(e.target.value)} required minLength={2} />
      </div>
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
      {isCreate && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Team manager <span className="text-destructive">*</span></Label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={refreshManagers}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Refresh
              </button>
              <Link href="/admin/users?role=team_manager" className="text-xs text-primary hover:underline">
                + Add new manager
              </Link>
            </div>
          </div>
          {noManagers ? (
            <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
              No unassigned managers. Use the link above to create one, then click Refresh.
            </p>
          ) : (
            <Select value={managerId} onValueChange={(v)=>setManagerId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick manager">
                  {(v: string) => {
                    if (!v) return null;
                    const m = managers.find(x => String(x.id) === v);
                    return m ? managerLabel(m) : null;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {managers.map(m => (
                  <SelectItem key={m.id} value={String(m.id)}>{managerLabel(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
      {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
      <Button
        type="submit"
        disabled={busy || (isCreate && noManagers)}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {busy ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
