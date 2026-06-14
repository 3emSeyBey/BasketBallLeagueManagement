"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type DivisionRef = { id: number; name: string; seasonName: string };
type BracketRef = { id: number; title: string; divisionId: number };

type Step = "division" | "mode" | "title";

export function CreateBracketWizard({
  divisions,
  brackets,
}: {
  divisions: DivisionRef[];
  brackets: BracketRef[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("division");
  const [divisionId, setDivisionId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [busy, setBusy] = useState(false);

  function reset() {
    setStep("division"); setDivisionId(""); setTitle(""); setIsDefault(false);
  }

  const existing = divisionId ? brackets.filter((b) => b.divisionId === Number(divisionId)) : [];

  function chooseDivision() {
    if (!divisionId) return;
    setStep(existing.length > 0 ? "mode" : "title");
  }

  async function create() {
    if (!title.trim() || !divisionId) return;
    setBusy(true);
    const res = await fetch("/api/brackets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ divisionId: Number(divisionId), title: title.trim(), isDefault }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Create failed");
      return;
    }
    const bracket = await res.json();
    setOpen(false);
    router.push(`/admin/brackets/${bracket.id}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}
    >
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" /> New bracket
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a bracket</DialogTitle>
          <DialogDescription>
            {step === "division" && "Which division is this bracket for?"}
            {step === "mode" && "This division already has a bracket."}
            {step === "title" && "Name your bracket."}
          </DialogDescription>
        </DialogHeader>

        {step === "division" && (
          <div className="space-y-4">
            {divisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No divisions exist yet. Create a season and a division first.
              </p>
            ) : (
              <Select value={divisionId} onValueChange={(v) => setDivisionId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick a division">
                    {(v: string) => {
                      const d = divisions.find((x) => String(x.id) === v);
                      return d ? `${d.seasonName} — ${d.name}` : "Pick a division";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.seasonName} — {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex justify-end">
              <Button onClick={chooseDivision} disabled={!divisionId}>Next</Button>
            </div>
          </div>
        )}

        {step === "mode" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">Edit an existing one</p>
              <ul className="divide-y rounded-md border">
                {existing.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent/40"
                      onClick={() => { setOpen(false); router.push(`/admin/brackets/${b.id}`); }}
                    >
                      <span>{b.title}</span>
                      <span className="text-xs text-muted-foreground">Open →</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <Button variant="ghost" onClick={() => setStep("division")}>Back</Button>
              <Button onClick={() => setStep("title")}>Create new instead</Button>
            </div>
          </div>
        )}

        {step === "title" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Bracket title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Championship Bracket"
                autoFocus
                maxLength={120}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
              Make this the division&apos;s default bracket (new teams auto-join round 1)
            </label>
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep(existing.length > 0 ? "mode" : "division")}>Back</Button>
              <Button onClick={create} disabled={busy || !title.trim()}>
                {busy ? "Creating…" : "Create bracket"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
