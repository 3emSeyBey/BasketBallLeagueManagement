"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type TeamOption = { id: number; name: string };

type Props = {
  seasonId: number;
  divisionId: number;
  divisionName: string;
  availableTeams: TeamOption[];
};

export function AddTeamDialog({ seasonId, divisionId, divisionName, availableTeams }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [teamId, setTeamId] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) { toast.error("Pick a team"); return; }
    setBusy(true);
    const res = await fetch(`/api/seasons/${seasonId}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: Number(teamId), divisionId }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Add failed");
      return;
    }
    toast.success("Team added");
    setOpen(false); setTeamId("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>+ Add team</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add team to {divisionName}</DialogTitle>
          <DialogDescription>The team enters this division&apos;s pool.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label>Team</Label>
            <Select value={teamId} onValueChange={(v)=>setTeamId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick an unenrolled team">
                  {(v: string) => {
                    if (!v) return null;
                    return availableTeams.find(t => String(t.id) === v)?.name ?? null;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableTeams.map(t => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" disabled={busy} />}>Cancel</DialogClose>
            <Button type="submit" disabled={busy || !teamId || availableTeams.length === 0}>
              {busy ? "Adding…" : "Add team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
