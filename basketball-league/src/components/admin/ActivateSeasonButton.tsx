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

// Default the date input to today (local) in YYYY-MM-DD form.
function todayLocal() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export function ActivateSeasonButton({ seasonId }: { seasonId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(todayLocal());
  const [busy, setBusy] = useState(false);

  async function activate(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate) {
      toast.error("Pick a start date");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/seasons/${seasonId}/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startedAt: new Date(startDate).toISOString() }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !json.ok) {
      toast.error(typeof json.error === "string" ? json.error : "Activation failed");
      return;
    }
    toast.success("Season activated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="bg-primary text-primary-foreground hover:bg-primary/90" />}>
        Activate season
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Activate season</DialogTitle>
          <DialogDescription>Activating ends the current active season.</DialogDescription>
        </DialogHeader>
        <form onSubmit={activate} className="space-y-4">
          <div className="space-y-2">
            <Label>Start date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" disabled={busy} />}>Cancel</DialogClose>
            <Button type="submit" disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {busy ? "Activating…" : "Activate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
