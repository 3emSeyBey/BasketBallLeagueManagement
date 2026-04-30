"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

export function DivisionTitle({
  id,
  name,
  canEdit,
}: {
  id: number;
  name: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEdit() {
    setDraft(name);
    setErr(null);
    setEditing(true);
  }

  async function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === name) {
      setEditing(false);
      setDraft(name);
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/team-divisions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Rename failed");
      return;
    }
    setEditing(false);
    setErr(null);
    router.refresh();
  }

  function cancel() {
    setEditing(false);
    setDraft(name);
    setErr(null);
  }

  if (!canEdit) {
    return <h2 className="text-xl font-semibold tracking-tight">{name}</h2>;
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          onBlur={save}
          disabled={busy}
          maxLength={60}
          className="rounded-md border bg-background px-2 py-1 text-xl font-semibold outline-none focus:ring-2 focus:ring-ring"
        />
        {err && (
          <span className="text-xs text-destructive" role="alert">
            {err}
          </span>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onDoubleClick={startEdit}
      title="Double-click to rename"
      className="group/title flex items-center gap-2 rounded-md px-1 -mx-1 text-xl font-semibold tracking-tight hover:bg-white/5 focus-visible:bg-white/5 outline-none"
    >
      {name}
      <Pencil className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover/title:opacity-100" />
    </button>
  );
}
