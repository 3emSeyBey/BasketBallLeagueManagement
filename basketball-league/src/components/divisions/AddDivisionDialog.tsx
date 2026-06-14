"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Season = { id: number; name: string };

export function AddDivisionDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/seasons", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data: Season[] = await res.json();
      if (cancelled) return;
      setSeasons(data);
      setSeasonId((prev) => prev || (data[0] ? String(data[0].id) : ""));
    })();
    return () => { cancelled = true; };
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!seasonId) { setErr("Pick a season"); return; }
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/seasons/${seasonId}/divisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Failed to add");
      return;
    }
    setName("");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" />
        }
      >
        <Plus className="size-4 mr-1.5" />
        Add Division
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New division</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Season</Label>
            {seasons.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-md border border-dashed p-3">
                No seasons yet. Create a season first.
              </p>
            ) : (
              <Select value={seasonId} onValueChange={(v) => setSeasonId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick a season" />
                </SelectTrigger>
                <SelectContent>
                  {seasons.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="div-name">Division name</Label>
            <Input
              id="div-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. North"
              required
              minLength={1}
              maxLength={60}
            />
          </div>
          {err && (
            <p role="alert" className="text-sm text-destructive">
              {err}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || seasons.length === 0}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {busy ? "Adding..." : "Add division"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
