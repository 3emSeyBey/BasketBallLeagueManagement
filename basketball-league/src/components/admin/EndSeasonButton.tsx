"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function EndSeasonButton({ seasonId }: { seasonId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function end() {
    if (!confirm("End this season? It moves to the read-only archive.")) return;
    setBusy(true);
    const res = await fetch(`/api/seasons/${seasonId}/end`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !json.ok) {
      toast.error(typeof json.error === "string" ? json.error : "End failed");
      return;
    }
    toast.success("Season ended");
    router.refresh();
  }

  return (
    <Button onClick={end} disabled={busy} variant="destructive">
      {busy ? "Ending…" : "End season"}
    </Button>
  );
}
