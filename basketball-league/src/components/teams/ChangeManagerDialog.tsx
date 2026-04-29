"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Manager = { id: number; email: string; name?: string | null };

function managerLabel(m: Manager): string {
  return m.name && m.name.trim() ? `${m.name} (${m.email})` : m.email;
}

export function ChangeManagerDialog({ teamId }: { teamId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [managerId, setManagerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/users/managers/unassigned", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data: Manager[] = await res.json();
        if (cancelled) return;
        setManagers(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!managerId) { toast.error("Pick a manager"); return; }
    setBusy(true);
    const res = await fetch(`/api/teams/${teamId}/manager`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId: Number(managerId) }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Switch failed");
      return;
    }
    setOpen(false);
    setManagerId("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="text-xs text-primary hover:underline"
          />
        }
      >
        Switch manager
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Switch team manager</DialogTitle>
          <DialogDescription>
            The current manager becomes unassigned. Pick a new manager from the unassigned pool.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>New manager</Label>
            {loading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : managers.length === 0 ? (
              <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
                No unassigned managers. Create one in <a href="/admin/users?role=team_manager" className="text-primary underline">User Management</a> first.
              </p>
            ) : (
              <Select value={managerId} onValueChange={(v)=>setManagerId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick unassigned manager">
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
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" disabled={busy} />}>Cancel</DialogClose>
            <Button type="submit" disabled={busy || !managerId || managers.length === 0}>
              {busy ? "Switching…" : "Switch manager"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
