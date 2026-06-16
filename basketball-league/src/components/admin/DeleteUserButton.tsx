"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  userId: number;
  userLabel: string;
  assignedToTeam: boolean;
};

export function DeleteUserButton({ userId, userLabel, assignedToTeam }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    setBusy(true);
    const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Delete failed");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>Delete</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {userLabel}?</DialogTitle>
          <DialogDescription>This permanently removes the user account.</DialogDescription>
        </DialogHeader>
        {assignedToTeam && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            This manager is assigned to a team. Deleting them will leave the team
            orphaned (no manager). You can assign a new manager later.
          </div>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={busy} />}>Cancel</DialogClose>
          <Button variant="destructive" onClick={onDelete} disabled={busy}>
            {busy ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
