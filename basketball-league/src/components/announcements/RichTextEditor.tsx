"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  initialHtml?: string;
  onChange: (html: string) => void;
};

export function RichTextEditor({ initialHtml = "", onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, autolink: true },
      }),
      Image.configure({ inline: false }),
    ],
    content: initialHtml,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[240px] p-4",
      },
    },
  });

  const insertImage = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/announcements/images", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Upload failed");
        return;
      }
      const { url } = await res.json();
      editor?.chain().focus().setImage({ src: url }).run();
    } finally {
      setUploading(false);
    }
  }, [editor]);

  if (!editor) return <div className="rounded-md border min-h-[240px]" />;

  return (
    <div className="rounded-md border bg-background">
      <Toolbar editor={editor} onImageClick={() => fileInputRef.current?.click()} uploading={uploading} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) insertImage(f);
          e.target.value = "";
        }}
      />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor, onImageClick, uploading }: { editor: Editor; onImageClick: () => void; uploading: boolean }) {
  const btn = (label: string, active: boolean, onClick: () => void) => (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "ghost"}
      onClick={onClick}
      className="h-7 px-2 text-xs"
    >
      {label}
    </Button>
  );

  const setLink = () => {
    const prev = editor.getAttributes("link").href ?? "";
    const url = window.prompt("URL", prev);
    if (url === null) return;
    if (url === "") editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap gap-1 border-b p-2">
      {btn("B", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run())}
      {btn("I", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run())}
      {btn("S", editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run())}
      <span className="mx-1 w-px bg-border" />
      {btn("H1", editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
      {btn("H2", editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
      {btn("H3", editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
      <span className="mx-1 w-px bg-border" />
      {btn("• List", editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run())}
      {btn("1. List", editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run())}
      {btn("❝", editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run())}
      <span className="mx-1 w-px bg-border" />
      {btn("Link", editor.isActive("link"), setLink)}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onImageClick}
        disabled={uploading}
        className="h-7 px-2 text-xs"
      >
        {uploading ? "Uploading…" : "Image"}
      </Button>
    </div>
  );
}
