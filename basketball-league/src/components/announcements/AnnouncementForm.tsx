"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { RichTextEditor } from "./RichTextEditor";

type Props = {
  mode: "create" | "edit";
  announcementId?: number;
  initialTitle?: string;
  initialBody?: string;
};

export function AnnouncementForm({ mode, announcementId, initialTitle = "", initialBody = "" }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title required"); return; }
    if (!body.trim() || body === "<p></p>") { toast.error("Body required"); return; }

    setSubmitting(true);
    const url = mode === "create" ? "/api/announcements" : `/api/announcements/${announcementId}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(typeof j.error === "string" ? j.error : "Save failed");
      return;
    }
    const data = await res.json().catch(() => ({}));
    const id = mode === "create" ? data.id : announcementId;
    router.push(`/announcements/${id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Announcement title"
          maxLength={200}
        />
      </div>
      <div className="space-y-2">
        <Label>Body</Label>
        <RichTextEditor initialHtml={initialBody} onChange={setBody} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : mode === "create" ? "Publish" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
