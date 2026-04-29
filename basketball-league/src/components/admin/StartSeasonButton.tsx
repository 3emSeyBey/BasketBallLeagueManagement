"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function StartSeasonButton({ seasonId }: { seasonId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start() {
    if (!confirm("Start this season? The bracket will be locked.")) return;
    setBusy(true);
    const res = await fetch(`/api/seasons/${seasonId}/start`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Start failed");
      return;
    }
    toast.success("Season started");
    router.refresh();
  }

  return (
    <Button onClick={start} disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">
      {busy ? "Starting…" : "Start season"}
    </Button>
  );
}
