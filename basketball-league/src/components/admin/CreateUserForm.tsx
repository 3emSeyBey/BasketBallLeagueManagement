"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Role = "admin" | "team_manager";

export function CreateUserForm({ initialRole = "team_manager" }: { initialRole?: Role }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(initialRole);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const res = await fetch("/api/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        username,
        contactNumber: contactNumber || undefined,
        password,
        role,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Create failed");
      return;
    }
    setName(""); setEmail(""); setUsername(""); setContactNumber(""); setPassword("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-2"><Label>Name <span className="text-destructive">*</span></Label><Input value={name} onChange={(e)=>setName(e.target.value)} required maxLength={120} /></div>
      <div className="space-y-2"><Label>Contact number</Label><Input type="tel" value={contactNumber} onChange={(e)=>setContactNumber(e.target.value)} placeholder="+63 9XX XXX XXXX" /></div>
      <div className="space-y-2"><Label>Email <span className="text-destructive">*</span></Label><Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required/></div>
      <div className="space-y-2"><Label>Username <span className="text-destructive">*</span></Label><Input value={username} onChange={(e)=>setUsername(e.target.value)} required minLength={3} maxLength={40} placeholder="e.g. juan_dela_cruz" /></div>
      <div className="space-y-2"><Label>Password <span className="text-destructive">*</span></Label><Input type="password" minLength={6} value={password} onChange={(e)=>setPassword(e.target.value)} required/></div>
      <div className="space-y-2"><Label>Role <span className="text-destructive">*</span></Label>
        <Select value={role} onValueChange={(v)=>setRole((v ?? "team_manager") as Role)}>
          <SelectTrigger>
            <SelectValue>{(v: string) => v === "admin" ? "Admin" : "Team Manager"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="team_manager">Team Manager</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">{busy?"Creating...":"+ Create"}</Button>
        {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
      </div>
    </form>
  );
}
