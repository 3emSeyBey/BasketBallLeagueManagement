"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function defaultSeasonName() {
  const y = new Date().getFullYear();
  return `Season ${y}`;
}

function toLocalInput(d: Date): string {
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function StartSeasonButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultSeasonName());
  const [startedAt, setStarted] = useState(() => toLocalInput(new Date()));
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
      toast.error(typeof j.error === "string" ? j.error : "Failed to create");
      return;
    }
    const data = await res.json();
    toast.success("Season created");
    setOpen(false);
    router.push(`/admin/seasons/${data.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="size-4" />
            Start a new season
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a new season</DialogTitle>
          <DialogDescription>
            Creates a draft season. Add divisions and teams afterwards.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label>Season name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Starts at</Label>
            <Input
              type="datetime-local"
              value={startedAt}
              onChange={(e) => setStarted(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" type="button" disabled={busy} />}
            >
              Cancel
            </DialogClose>
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
