"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Team } from "@/db/schema";

export function CreateUserForm({ teams }: { teams: Team[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin"|"team_manager">("team_manager");
  const [teamId, setTeamId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const res = await fetch("/api/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role, teamId: teamId ? Number(teamId) : undefined }),
    });
    setBusy(false);
    if (!res.ok) { setErr("Create failed (email may exist)"); return; }
    setEmail(""); setPassword(""); setTeamId(""); router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
      <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required/></div>
      <div className="space-y-2"><Label>Password</Label><Input type="password" minLength={6} value={password} onChange={(e)=>setPassword(e.target.value)} required/></div>
      <div className="space-y-2"><Label>Role</Label>
        <Select value={role} onValueChange={(v)=>setRole((v ?? "team_manager") as "admin"|"team_manager")}>
          <SelectTrigger><SelectValue/></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="team_manager">Team Manager</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {role === "team_manager" && (
        <div className="space-y-2"><Label>Team</Label>
          <Select value={teamId} onValueChange={(v)=>setTeamId(v ?? "")}>
            <SelectTrigger><SelectValue placeholder="Pick team"/></SelectTrigger>
            <SelectContent>{teams.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <Button type="submit" disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">{busy?"Creating...":"+ Create"}</Button>
      {err && <p role="alert" className="col-span-full text-sm text-destructive">{err}</p>}
    </form>
  );
}
