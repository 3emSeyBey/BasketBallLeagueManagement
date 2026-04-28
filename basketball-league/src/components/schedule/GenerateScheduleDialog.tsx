"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function GenerateScheduleDialog({ seasonId }: { seasonId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [division, setDivision] = useState<"A" | "B">("A");
  const [startDate, setStartDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/matches/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seasonId,
        division,
        startDate: new Date(startDate).toISOString(),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setErr("Generation failed");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Auto-generate</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Round-Robin Schedule</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Division</Label>
            <Select
              value={division}
              onValueChange={(v) => setDivision(v as "A" | "B")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Division A</SelectItem>
                <SelectItem value="B">Division B</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Start date</Label>
            <Input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          {err && (
            <p role="alert" className="text-sm text-destructive">
              {err}
            </p>
          )}
          <Button
            onClick={go}
            disabled={busy || !startDate}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {busy ? "Generating..." : "Generate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
