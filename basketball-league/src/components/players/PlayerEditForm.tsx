"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Pos = "PG" | "SG" | "SF" | "PF" | "C";

type Props = {
  player: {
    id: number;
    name: string;
    jerseyNumber: number;
    position: Pos;
    height: string | null;
    contactNumber: string | null;
    hasImage: boolean;
  };
};

export function PlayerEditForm({ player }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(player.name);
  const [jersey, setJersey] = useState(String(player.jerseyNumber));
  const [position, setPosition] = useState<Pos>(player.position);
  const [height, setHeight] = useState(player.height ?? "");
  const [contactNumber, setContactNumber] = useState(player.contactNumber ?? "");
  const [hasImage, setHasImage] = useState(player.hasImage);
  const [imgKey, setImgKey] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);

  async function uploadImage(file: File) {
    setImgBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/players/${player.id}/image`, { method: "POST", body: fd });
    setImgBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Upload failed");
      return;
    }
    setHasImage(true);
    setImgKey(Date.now());
    router.refresh();
  }

  async function removeImage() {
    if (!confirm("Remove this player's photo?")) return;
    setImgBusy(true);
    const res = await fetch(`/api/players/${player.id}/image`, { method: "DELETE" });
    setImgBusy(false);
    if (!res.ok) { toast.error("Remove failed"); return; }
    setHasImage(false);
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        jerseyNumber: Number(jersey),
        position,
        height: height || null,
        contactNumber: contactNumber || null,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Save failed");
      return;
    }
    router.push(`/players/${player.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Photo</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="size-32 rounded-xl bg-muted overflow-hidden grid place-items-center">
            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/players/${player.id}/image?v=${imgKey}`}
                alt={player.name}
                className="size-full object-cover"
              />
            ) : (
              <span className="text-muted-foreground text-xs">No photo</span>
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
                if (f) uploadImage(f);
                e.target.value = "";
              }}
            />
            <Button type="button" variant="outline" size="sm" disabled={imgBusy} onClick={() => fileRef.current?.click()}>
              {hasImage ? "Replace photo" : "Upload photo"}
            </Button>
            {hasImage && (
              <Button type="button" variant="ghost" size="sm" disabled={imgBusy} onClick={removeImage}>
                Remove photo
              </Button>
            )}
            <p className="text-xs text-muted-foreground">PNG, JPEG, WEBP, or GIF. Max 5MB.</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Details</h2>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2 sm:col-span-2"><Label>Name</Label><Input value={name} onChange={(e)=>setName(e.target.value)} required minLength={2} maxLength={80} /></div>
          <div className="space-y-2"><Label>Jersey #</Label><Input type="number" min={0} max={99} value={jersey} onChange={(e)=>setJersey(e.target.value)} required /></div>
          <div className="space-y-2">
            <Label>Position</Label>
            <Select value={position} onValueChange={(v)=>setPosition(v as Pos)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["PG","SG","SF","PF","C"] as Pos[]).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Height</Label><Input value={height} onChange={(e)=>setHeight(e.target.value)} placeholder='e.g. 6&apos;7"' maxLength={20} /></div>
          <div className="space-y-2"><Label>Contact number</Label><Input type="tel" value={contactNumber} onChange={(e)=>setContactNumber(e.target.value)} placeholder="+63 9XX XXX XXXX" maxLength={40} /></div>
          <div className="sm:col-span-2 flex gap-2">
            <Button type="submit" disabled={busy}>{busy ? "Saving..." : "Save changes"}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={busy}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
