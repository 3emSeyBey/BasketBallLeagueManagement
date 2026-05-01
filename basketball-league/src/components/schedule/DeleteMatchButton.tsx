"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function DeleteMatchButton({
  matchId,
  label = "Delete",
  matchup,
  redirectTo,
}: {
  matchId: number;
  label?: string;
  matchup?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handle() {
    const confirmText = matchup
      ? `Delete this match (${matchup})? Brackets will update accordingly.`
      : "Delete this match? Brackets will update accordingly.";
    if (!confirm(confirmText)) return;
    setBusy(true);
    const res = await fetch(`/api/matches/${matchId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Match deleted");
    if (redirectTo) router.push(redirectTo);
    else router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      title="Delete match"
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-destructive ring-1 ring-destructive/30 bg-destructive/5 hover:bg-destructive/15 transition-colors disabled:opacity-50"
    >
      <Trash2 className="size-3.5" />
      {label}
    </button>
  );
}
