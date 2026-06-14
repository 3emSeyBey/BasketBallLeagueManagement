"use client";

import { useState } from "react";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BracketGrid, type BracketBox } from "@/components/brackets/BracketGrid";

type Div = { id: number; name: string; bracketId: number | null };

export function DivisionBracketModal({ divisions }: { divisions: Div[] }) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string>("");
  const [rounds, setRounds] = useState<BracketBox[][] | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function pick(value: string | null) {
    const v = value ?? "";
    setChosen(v);
    setRounds(null);
    setNote(null);
    if (!v) return;
    const div = divisions.find((d) => String(d.id) === v);
    if (!div?.bracketId) {
      setNote("No published bracket for this division yet.");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/brackets/${div.bracketId}`, { cache: "no-store" });
    setLoading(false);
    if (!res.ok) {
      setNote("Could not load bracket.");
      return;
    }
    const data = await res.json();
    setRounds(data.rounds as BracketBox[][]);
  }

  return (
    <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center">
      <p className="text-sm text-muted-foreground">Showing all divisions.</p>
      <Button className="mt-3" variant="outline" onClick={() => setOpen(true)}>
        <LayoutGrid className="size-4" /> View a division&apos;s bracket
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setChosen(""); setRounds(null); setNote(null); } }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Division bracket</DialogTitle>
          </DialogHeader>
          <Select value={chosen} onValueChange={pick}>
            <SelectTrigger className="w-60">
              <SelectValue placeholder="Pick a division">
                {(v: string) => divisions.find((d) => String(d.id) === v)?.name ?? "Pick a division"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {divisions.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="min-h-24">
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
            ) : note ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{note}</p>
            ) : rounds ? (
              <BracketGrid rounds={rounds} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Select a division to view its bracket.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
