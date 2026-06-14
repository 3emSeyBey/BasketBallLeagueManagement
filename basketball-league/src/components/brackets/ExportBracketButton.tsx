"use client";

import { useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { Download, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BracketGrid, type BracketBox } from "./BracketGrid";

// Downloads the bracket as a polished, themed PNG. Renders a hidden, dark-themed
// "export frame" off-screen (header + bracket + footer branding) and captures it.
export function ExportBracketButton({
  title,
  season,
  division,
  rounds,
}: {
  title: string;
  season: string | null;
  division: string | null;
  rounds: BracketBox[][];
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  async function exportPng() {
    if (!frameRef.current) return;
    setBusy(true);
    try {
      const blob = await toBlob(frameRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#0b1120",
      });
      if (!blob) return;
      const slug = title.replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "bracket";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}-bracket.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={exportPng} disabled={busy}>
        <Download className="size-4" /> {busy ? "Exporting…" : "Export PNG"}
      </Button>

      {/* Off-screen themed capture frame. */}
      <div className="pointer-events-none fixed -left-[100000px] top-0" aria-hidden>
        <div
          ref={frameRef}
          className="dark w-max p-10"
          style={{
            background:
              "radial-gradient(1200px 500px at 0% 0%, rgba(243,112,33,0.18), transparent 55%), linear-gradient(135deg, #0b1120 0%, #0f172a 55%, #111827 100%)",
          }}
        >
          {/* Header */}
          <div className="mb-6 flex items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
                <Trophy className="size-6 text-primary" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
                  {[season, division].filter(Boolean).join(" · ") || "Bracket"}
                </p>
                <h1 className="font-heading text-2xl font-bold tracking-tight text-white">{title}</h1>
              </div>
            </div>
            <span className="text-sm font-semibold text-white/70">Basketball League</span>
          </div>

          {/* Bracket on a card surface */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
            <BracketGrid rounds={rounds} />
          </div>

          {/* Footer */}
          <div className="mt-5 flex items-center justify-between text-xs text-white/40">
            <span>Single-elimination bracket</span>
            <span>basketball-league</span>
          </div>
        </div>
      </div>
    </>
  );
}
