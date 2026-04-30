"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Initial = { name?: string; division?: string };
type Manager = { id: number; email: string; name?: string | null };

function managerLabel(m: Manager): string {
  return m.name && m.name.trim() ? `${m.name} (${m.email})` : m.email;
}

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export function TeamForm({
  id,
  initial,
  unassignedManagers: initialManagers = [],
  divisions: initialDivisions = [],
  hasExistingImage = false,
}: {
  id?: number;
  initial?: Initial;
  unassignedManagers?: Manager[];
  divisions?: string[];
  hasExistingImage?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [division, setDivision] = useState<string>(
    initial?.division ?? initialDivisions[0] ?? "",
  );
  const [divisions, setDivisions] = useState<string[]>(initialDivisions);
  const [managerId, setManagerId] = useState<string>("");
  const [managers, setManagers] = useState<Manager[]>(initialManagers);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isCreate = !id;
  const noManagers = managers.length === 0;

  const refreshManagers = useCallback(async () => {
    try {
      const res = await fetch("/api/users/managers/unassigned", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data: Manager[] = await res.json();
      setManagers(data);
      if (managerId && !data.some((m) => String(m.id) === managerId))
        setManagerId("");
    } catch {}
  }, [managerId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/team-divisions", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data: { id: number; name: string }[] = await res.json();
        if (cancelled) return;
        setDivisions(data.map((d) => d.name));
        setDivision((prev) => prev || data[0]?.name || "");
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isCreate) return;
    let cancelled = false;
    const run = async () => {
      const res = await fetch("/api/users/managers/unassigned", {
        cache: "no-store",
      });
      if (!res.ok || cancelled) return;
      const data: Manager[] = await res.json();
      if (cancelled) return;
      setManagers(data);
    };
    void run();
    const onFocus = () => {
      void run();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [isCreate]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setErr(null);
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErr("Use PNG, JPG, WebP, or GIF");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErr("Image must be under 5MB");
      e.target.value = "";
      return;
    }
    setImageFile(file);
    setRemoveImage(false);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadImage(teamId: number) {
    if (!imageFile) return;
    const fd = new FormData();
    fd.append("file", imageFile);
    const res = await fetch(`/api/teams/${teamId}/image`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(typeof j.error === "string" ? j.error : "Image upload failed");
    }
  }

  async function deleteImage(teamId: number) {
    const res = await fetch(`/api/teams/${teamId}/image`, { method: "DELETE" });
    if (!res.ok) throw new Error("Image removal failed");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    if (isCreate && !managerId) {
      setBusy(false);
      setErr("Pick a manager");
      return;
    }
    if (!division) {
      setBusy(false);
      setErr("Pick a division");
      return;
    }
    const url = id ? `/api/teams/${id}` : "/api/teams";
    const body: Record<string, unknown> = { name, division };
    if (isCreate) body.managerId = Number(managerId);
    const res = await fetch(url, {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setBusy(false);
      const j = await res.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Save failed");
      return;
    }
    const team = await res.json();
    try {
      if (imageFile) await uploadImage(team.id);
      else if (removeImage && id) await deleteImage(id);
    } catch (e) {
      setBusy(false);
      setErr(e instanceof Error ? e.message : "Image save failed");
      return;
    }
    setBusy(false);
    router.push("/teams");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5 max-w-md">
      <div className="space-y-2">
        <Label>Team logo / image</Label>
        <div className="flex items-center gap-4">
          <div className="size-20 rounded-xl bg-muted ring-1 ring-white/10 grid place-items-center overflow-hidden">
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePreview}
                alt="Preview"
                className="size-full object-cover"
              />
            ) : !removeImage && hasExistingImage && id ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/teams/${id}/image`}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <ImagePlus className="size-7 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <label
              className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm cursor-pointer hover:bg-accent/40"
            >
              <ImagePlus className="size-4" />
              {imageFile ? "Change image" : "Choose image"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={onFile}
                className="hidden"
              />
            </label>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WebP, GIF · max 5MB
            </p>
            {!isCreate && hasExistingImage && !imageFile && !removeImage && (
              <button
                type="button"
                onClick={() => setRemoveImage(true)}
                className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
              >
                <Trash2 className="size-3" />
                Remove current image
              </button>
            )}
            {removeImage && (
              <p className="text-xs text-muted-foreground">
                Image will be removed on save.{" "}
                <button
                  type="button"
                  onClick={() => setRemoveImage(false)}
                  className="text-primary hover:underline"
                >
                  Undo
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Team name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
        />
      </div>
      <div className="space-y-2">
        <Label>Division</Label>
        {divisions.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-md border border-dashed p-3">
            No divisions yet.{" "}
            <Link href="/teams" className="text-primary hover:underline">
              Add a division
            </Link>{" "}
            first.
          </p>
        ) : (
          <Select value={division} onValueChange={(v) => setDivision(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pick a division" />
            </SelectTrigger>
            <SelectContent>
              {divisions.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {isCreate && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>
              Team manager <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={refreshManagers}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Refresh
              </button>
              <Link
                href="/admin/users?role=team_manager"
                className="text-xs text-primary hover:underline"
              >
                + Add new manager
              </Link>
            </div>
          </div>
          {noManagers ? (
            <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
              No unassigned managers. Use the link above to create one, then
              click Refresh.
            </p>
          ) : (
            <Select
              value={managerId}
              onValueChange={(v) => setManagerId(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick manager">
                  {(v: string) => {
                    if (!v) return null;
                    const m = managers.find((x) => String(x.id) === v);
                    return m ? managerLabel(m) : null;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {managerLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
      {err && (
        <p role="alert" className="text-sm text-destructive">
          {err}
        </p>
      )}
      <Button
        type="submit"
        disabled={busy || (isCreate && noManagers) || divisions.length === 0}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {busy ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
