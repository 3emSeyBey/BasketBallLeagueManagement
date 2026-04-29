"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Props = {
  user: {
    id: number;
    email: string;
    username: string | null;
    name: string;
    contactNumber: string | null;
  };
};

export function EditUserDialog({ user }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [username, setUsername] = useState(user.username ?? "");
  const [contactNumber, setContactNumber] = useState(user.contactNumber ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const body: Record<string, unknown> = {};
    if (name !== user.name) body.name = name;
    if (email !== user.email) body.email = email;
    if (username !== (user.username ?? "")) body.username = username;
    if (contactNumber !== (user.contactNumber ?? "")) body.contactNumber = contactNumber;
    if (password) body.password = password;

    if (Object.keys(body).length === 0) { setBusy(false); setOpen(false); return; }

    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Save failed");
      return;
    }
    setPassword("");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Edit</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>Leave password empty to keep the current one.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e)=>setName(e.target.value)} required maxLength={120} /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required /></div>
          <div className="space-y-2"><Label>Username</Label><Input value={username} onChange={(e)=>setUsername(e.target.value)} required minLength={3} maxLength={40} /></div>
          <div className="space-y-2"><Label>Contact number</Label><Input type="tel" value={contactNumber} onChange={(e)=>setContactNumber(e.target.value)} placeholder="optional" /></div>
          <div className="space-y-2"><Label>New password</Label><Input type="password" minLength={6} value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="leave blank to keep" /></div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" disabled={busy} />}>Cancel</DialogClose>
            <Button type="submit" disabled={busy}>{busy?"Saving...":"Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
