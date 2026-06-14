"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff } from "lucide-react";
import { generatePassword } from "@/lib/password";

type Division = { id: number; name: string; seasonName: string };
type AvailableTeam = { id: number; name: string; division: string | null };
type TeamMode = "create" | "existing";

export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revealPassword, setRevealPassword] = useState(false);

  const [teamMode, setTeamMode] = useState<TeamMode>("create");
  const [teamName, setTeamName] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [teamId, setTeamId] = useState("");

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [availableTeams, setAvailableTeams] = useState<AvailableTeam[]>([]);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/divisions").then(r => r.ok ? r.json() : []).then(setDivisions).catch(() => {});
    fetch("/api/teams/available").then(r => r.ok ? r.json() : []).then(setAvailableTeams).catch(() => {});
  }, []);

  function goToTeamStep() {
    setErr(null);
    if (!name.trim() || !email.trim() || username.trim().length < 3 || password.length < 6) {
      setErr("Fill in all required fields. Username needs 3+ chars, password 6+.");
      return;
    }
    if (password !== confirmPassword) {
      setErr("Passwords do not match.");
      return;
    }
    setStep(2);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (teamMode === "create" && (teamName.trim().length < 2 || !divisionId)) {
      setErr("Enter a team name (2+ chars) and pick a division.");
      return;
    }
    if (teamMode === "existing" && !teamId) {
      setErr("Pick a team to manage.");
      return;
    }
    setBusy(true);
    const payload =
      teamMode === "create"
        ? { name, email, username, contactNumber: contactNumber || undefined, password, teamMode, teamName, divisionId: Number(divisionId) }
        : { name, email, username, contactNumber: contactNumber || undefined, password, teamMode, teamId: Number(teamId) };
    const res = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setBusy(false);
      const j = await res.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Registration failed. Check your details.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={step === 1 ? "text-primary font-medium" : ""}>1. Your details</span>
        <span>›</span>
        <span className={step === 2 ? "text-primary font-medium" : ""}>2. Your team</span>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reg-name">Full name <span className="text-destructive">*</span></Label>
            <Input id="reg-name" value={name} onChange={e => setName(e.target.value)} maxLength={120} autoComplete="name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-email">Email <span className="text-destructive">*</span></Label>
            <Input id="reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-username">Username <span className="text-destructive">*</span></Label>
            <Input id="reg-username" value={username} onChange={e => setUsername(e.target.value)} minLength={3} maxLength={40} placeholder="e.g. juan_dela_cruz" autoComplete="username" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-contact">Contact number</Label>
            <Input id="reg-contact" type="tel" value={contactNumber} onChange={e => setContactNumber(e.target.value)} placeholder="+63 9XX XXX XXXX" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="reg-password">Password <span className="text-destructive">*</span></Label>
              <button
                type="button"
                onClick={() => { const p = generatePassword(); setPassword(p); setConfirmPassword(p); setRevealPassword(true); }}
                className="text-xs text-primary underline-offset-4 hover:underline"
              >
                Generate a password
              </button>
            </div>
            <div className="relative">
              <Input id="reg-password" type={revealPassword ? "text" : "password"} minLength={6} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" className="pr-9" />
              <button
                type="button"
                onClick={() => setRevealPassword(v => !v)}
                aria-label={revealPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
              >
                {revealPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-confirm">Confirm password <span className="text-destructive">*</span></Label>
            <Input id="reg-confirm" type={revealPassword ? "text" : "password"} minLength={6} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" />
            {confirmPassword.length > 0 && confirmPassword !== password && (
              <p className="text-xs text-destructive">Passwords do not match.</p>
            )}
          </div>
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          <Button type="button" onClick={goToTeamStep} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            Continue
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTeamMode("create")}
              aria-pressed={teamMode === "create"}
              className={`rounded-lg border p-3 text-left text-sm transition-colors ${teamMode === "create" ? "border-primary bg-primary/10" : "border-input hover:bg-muted/50"}`}
            >
              <span className="font-medium block">Create a team</span>
              <span className="text-xs text-muted-foreground">Register a brand-new team</span>
            </button>
            <button
              type="button"
              onClick={() => setTeamMode("existing")}
              aria-pressed={teamMode === "existing"}
              className={`rounded-lg border p-3 text-left text-sm transition-colors ${teamMode === "existing" ? "border-primary bg-primary/10" : "border-input hover:bg-muted/50"}`}
            >
              <span className="font-medium block">Select existing</span>
              <span className="text-xs text-muted-foreground">Manage a team without a manager</span>
            </button>
          </div>

          {teamMode === "create" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-teamname">Team name <span className="text-destructive">*</span></Label>
                <Input id="reg-teamname" value={teamName} onChange={e => setTeamName(e.target.value)} minLength={2} maxLength={80} placeholder="e.g. Cebu Cyclones" />
              </div>
              <div className="space-y-2">
                <Label>Division <span className="text-destructive">*</span></Label>
                <Select value={divisionId} onValueChange={(v) => setDivisionId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a division">
                      {(v: string) => {
                        const d = divisions.find((x) => String(x.id) === v);
                        return d ? `${d.seasonName} — ${d.name}` : "Select a division";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.seasonName} — {d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Team <span className="text-destructive">*</span></Label>
              {availableTeams.length === 0 ? (
                <p className="text-sm text-muted-foreground">No teams without a manager are available right now. Create one instead.</p>
              ) : (
                <Select value={teamId} onValueChange={(v) => setTeamId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a team">
                      {(v: string) => availableTeams.find(t => String(t.id) === v)?.name ?? "Select a team"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableTeams.map(t => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name}{t.division ? ` · ${t.division}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            New accounts need admin approval before you can manage your team. You&apos;ll be signed in right away.
          </p>
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => { setErr(null); setStep(1); }} className="flex-1">
              Back
            </Button>
            <Button type="submit" disabled={busy || (teamMode === "existing" && availableTeams.length === 0)} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
              {busy ? "Creating..." : "Create account"}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
