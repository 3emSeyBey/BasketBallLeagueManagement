"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Initial = {
  email: string;
  username: string;
  name: string;
  contactNumber: string;
};

export function ProfileForm({
  initial,
  showUsername = true,
  showContact = true,
}: {
  initial: Initial;
  showUsername?: boolean;
  showContact?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(initial.email);
  const [username, setUsername] = useState(initial.username);
  const [name, setName] = useState(initial.name);
  const [contactNumber, setContact] = useState(initial.contactNumber);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const body: Record<string, string | null> = {};
    if (email !== initial.email) body.email = email;
    if (showUsername && username !== initial.username) body.username = username;
    if (name !== initial.name) body.name = name;
    if (showContact && contactNumber !== initial.contactNumber)
      body.contactNumber = contactNumber || null;

    if (Object.keys(body).length === 0) {
      setBusy(false);
      toast.message("Nothing to update");
      return;
    }

    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Update failed");
      return;
    }
    toast.success("Profile updated");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <Label className="text-xs">Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={1} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Email</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      {showUsername && (
        <div className="space-y-1">
          <Label className="text-xs">Username</Label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            pattern="[a-zA-Z0-9_.\-]+"
          />
        </div>
      )}
      {showContact && (
        <div className="space-y-1">
          <Label className="text-xs">Contact number</Label>
          <Input
            value={contactNumber}
            onChange={(e) => setContact(e.target.value)}
          />
        </div>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
