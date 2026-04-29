"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Pos = "PG" | "SG" | "SF" | "PF" | "C";

export function AddPlayerDialog({ teamId }: { teamId: number }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [jersey, setJersey] = useState("");
  const [position, setPosition] = useState<Pos>("PG");
  const [height, setHeight] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setName(""); setJersey(""); setPosition("PG");
    setHeight(""); setContactNumber("");
    setImageFile(null); setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function pickImage(file: File) {
    setImageFile(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(file));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId,
        name,
        jerseyNumber: Number(jersey),
        position,
        height: height || undefined,
        contactNumber: contactNumber || undefined,
      }),
    });
    if (!res.ok) {
      setBusy(false);
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Save failed (jersey may be taken)");
      return;
    }
    const created = await res.json().catch(() => null) as { id?: number } | null;
    const newId = created?.id;

    if (newId && imageFile) {
      const fd = new FormData();
      fd.append("file", imageFile);
      const upRes = await fetch(`/api/players/${newId}/image`, { method: "POST", body: fd });
      if (!upRes.ok) {
        toast.error("Player added but photo upload failed");
      }
    }

    setBusy(false);
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger render={<Button className="bg-primary text-primary-foreground hover:bg-primary/90" />}>
        + Add Player
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add player</DialogTitle>
          <DialogDescription>Fill in the player details. Photo is optional.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="size-20 rounded-xl bg-muted overflow-hidden grid place-items-center shrink-0">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="preview" className="size-full object-cover" />
              ) : (
                <span className="text-xs text-muted-foreground">No photo</span>
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) pickImage(f);
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                {imagePreview ? "Replace photo" : "Upload photo"}
              </Button>
              {imagePreview && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ""; }}>
                  Remove
                </Button>
              )}
              <p className="text-xs text-muted-foreground">PNG, JPEG, WEBP, GIF. Max 5MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2 sm:col-span-2"><Label>Name <span className="text-destructive">*</span></Label><Input value={name} onChange={(e)=>setName(e.target.value)} required minLength={2} maxLength={80} /></div>
            <div className="space-y-2"><Label>Jersey # <span className="text-destructive">*</span></Label><Input type="number" min={0} max={99} value={jersey} onChange={(e)=>setJersey(e.target.value)} required /></div>
            <div className="space-y-2">
              <Label>Position <span className="text-destructive">*</span></Label>
              <Select value={position} onValueChange={(v)=>setPosition(v as Pos)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["PG","SG","SF","PF","C"] as Pos[]).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Height</Label><Input value={height} onChange={(e)=>setHeight(e.target.value)} placeholder='e.g. 6&apos;7"' maxLength={20} /></div>
            <div className="space-y-2"><Label>Contact number</Label><Input type="tel" value={contactNumber} onChange={(e)=>setContactNumber(e.target.value)} placeholder="+63 9XX XXX XXXX" maxLength={40} /></div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" disabled={busy} />}>Cancel</DialogClose>
            <Button type="submit" disabled={busy}>{busy ? "Adding…" : "Add player"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
