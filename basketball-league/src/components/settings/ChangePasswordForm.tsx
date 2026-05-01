"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Update failed");
      return;
    }
    toast.success("Password updated");
    setCurrent("");
    setNew("");
    setConfirm("");
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-1">
        <Label className="text-xs">Current password</Label>
        <Input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">New password</Label>
        <Input
          type="password"
          value={newPassword}
          onChange={(e) => setNew(e.target.value)}
          required
          minLength={6}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Confirm new password</Label>
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={6}
        />
      </div>
      <div className="sm:col-span-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Updating…" : "Update password"}
        </Button>
      </div>
    </form>
  );
}
