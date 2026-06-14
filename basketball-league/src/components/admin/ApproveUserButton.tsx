"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ApproveUserButton({ userId, label }: { userId: number; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function approve() {
    if (!confirm(`Approve ${label}? This creates/assigns their team.`)) return;
    setBusy(true);
    const res = await fetch(`/api/users/${userId}/approve`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Approve failed");
      return;
    }
    toast.success("Approved");
    router.refresh();
  }

  return (
    <Button size="sm" disabled={busy} onClick={approve}>
      <Check className="size-4" /> {busy ? "Approving…" : "Approve"}
    </Button>
  );
}
