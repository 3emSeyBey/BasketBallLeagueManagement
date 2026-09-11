"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inUseElsewhere, setInUseElsewhere] = useState(false);

  async function login(force: boolean) {
    setError(null); setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password, force }),
    });
    setLoading(false);
    if (res.status === 409) { setInUseElsewhere(true); return; }
    setInUseElsewhere(false);
    if (!res.ok) { setError("Invalid credentials"); return; }
    router.push("/dashboard");
    router.refresh();
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void login(false);
  }

  function cancelLogin() {
    setInUseElsewhere(false);
    setPassword("");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="identifier">Email or username</Label>
        <Input id="identifier" type="text" required autoComplete="username"
          value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" required autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </Button>

      <Dialog open={inUseElsewhere} onOpenChange={(o) => { if (!o) cancelLogin(); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Account in use</DialogTitle>
            <DialogDescription>
              This account is being used elsewhere. You can continue your login here and the
              other session will be logged out, or cancel your login here.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cancelLogin}>
              Cancel login
            </Button>
            <Button type="button" onClick={() => void login(true)} disabled={loading}>
              Continue logging in here
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
