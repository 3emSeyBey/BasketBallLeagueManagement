"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Division = { id: number; seasonId: number; name: string; createdAt: string };

export function DivisionManager({
  seasonId,
  initialDivisions,
}: {
  seasonId: number;
  initialDivisions: Division[];
}) {
  const router = useRouter();
  const [divisions, setDivisions] = useState<Division[]>(initialDivisions);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function refresh() {
    const res = await fetch(`/api/seasons/${seasonId}/divisions`, { cache: "no-store" });
    if (res.ok) setDivisions(await res.json());
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    const res = await fetch(`/api/seasons/${seasonId}/divisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setCreating(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Create failed");
      return;
    }
    setNewName("");
    await refresh();
    router.refresh();
  }

  function startEdit(d: Division) {
    setEditingId(d.id);
    setEditingName(d.name);
  }

  async function saveEdit(d: Division) {
    const name = editingName.trim();
    if (!name) return;
    if (name === d.name) {
      setEditingId(null);
      return;
    }
    setBusyId(d.id);
    const res = await fetch(`/api/divisions/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusyId(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Rename failed");
      return;
    }
    setEditingId(null);
    await refresh();
    router.refresh();
  }

  async function remove(d: Division) {
    if (!confirm(`Delete division "${d.name}"?`)) return;
    setBusyId(d.id);
    const res = await fetch(`/api/divisions/${d.id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Delete failed");
      return;
    }
    await refresh();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="flex gap-2 items-center">
        <Input
          placeholder="New division name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={80}
        />
        <Button type="submit" disabled={creating || !newName.trim()}>
          {creating ? "Adding…" : "Add"}
        </Button>
      </form>

      {divisions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No divisions yet. Add the first one above.</p>
      ) : (
        <ul className="divide-y border rounded-md">
          {divisions.map((d) => {
            const isEditing = editingId === d.id;
            const isBusy = busyId === d.id;
            return (
              <li key={d.id} className="flex items-center gap-3 p-3">
                {isEditing ? (
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    maxLength={80}
                    autoFocus
                  />
                ) : (
                  <span className="font-medium">{d.name}</span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button size="sm" onClick={() => saveEdit(d)} disabled={isBusy || !editingName.trim()}>
                        {isBusy ? "Saving…" : "Save"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} disabled={isBusy}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => startEdit(d)} disabled={isBusy}>
                        Rename
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(d)} disabled={isBusy}>
                        {isBusy ? "…" : "Delete"}
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
