"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Props = {
  matchId: number;
  initialScheduledAt: string | null;
  initialVenue: string;
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function ScheduleEditDialog({ matchId, initialScheduledAt, initialVenue }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(() => toLocalInput(initialScheduledAt));
  const [venue, setVenue] = useState(initialVenue);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const iso = scheduledAt ? new Date(scheduledAt).toISOString() : null;
    const res = await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledAt: iso,
        venue,
        status: iso ? "scheduled" : "planned",
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Update failed");
      return;
    }
    toast.success("Schedule updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Edit schedule</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit match schedule</DialogTitle>
          <DialogDescription>
            Leave date empty to mark match as planned.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label>Scheduled at</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Venue</Label>
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} required minLength={2} />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" disabled={busy} />}>Cancel</DialogClose>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
