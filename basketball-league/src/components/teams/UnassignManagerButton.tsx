"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function UnassignManagerButton({ teamId }: { teamId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function unassign() {
    if (!confirm("Unassign the manager from this team? The team becomes orphaned and the freed manager can then be deleted.")) return;
    setBusy(true);
    const res = await fetch(`/api/teams/${teamId}/manager`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Unassign failed");
      return;
    }
    toast.success("Manager unassigned. Team is now orphaned.");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={unassign}
      disabled={busy}
      className="text-xs text-destructive hover:underline disabled:opacity-50"
    >
      {busy ? "Unassigning…" : "Unassign"}
    </button>
  );
}
