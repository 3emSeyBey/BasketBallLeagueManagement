"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send } from "lucide-react";

const POLL_MS = 1500;
const MAX_BODY_LEN = 500;
const MAX_LABEL_LEN = 40;
const GUEST_ID_KEY = "chatGuestId";
const GUEST_NAME_KEY = "chatDisplayName";

type ChatMessage = {
  id: number;
  senderLabel: string;
  senderId: number | null;
  body: string;
  createdAt: string;
};

function newGuestId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function ChatBox({
  matchId,
  frozen,
  loggedInLabel,
}: {
  matchId: number;
  // Once the match has ended, chat stays visible but read-only.
  frozen: boolean;
  // Pass the viewer's display name when they're logged in — skips the guest
  // name prompt. Omit for anonymous public viewers.
  loggedInLabel?: string | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // Guest identity: a stable per-browser id + a display name, both kept in
  // localStorage so returning viewers don't have to re-enter a name. Read via
  // lazy useState initializers (not an effect) — this only needs to run once
  // per mount, and `typeof window` guards the server-rendered pass.
  const [guestKey] = useState<string | null>(() => {
    if (loggedInLabel || typeof window === "undefined") return null;
    try {
      let id = localStorage.getItem(GUEST_ID_KEY);
      if (!id) {
        id = newGuestId();
        localStorage.setItem(GUEST_ID_KEY, id);
      }
      return id;
    } catch {
      // localStorage unavailable (private mode etc.) — an in-memory id still
      // lets this session chat, it just won't persist across visits.
      return newGuestId();
    }
  });
  const [guestName, setGuestName] = useState<string | null>(() => {
    if (loggedInLabel || typeof window === "undefined") return null;
    try {
      return localStorage.getItem(GUEST_NAME_KEY);
    } catch {
      return null;
    }
  });
  const [nameDraft, setNameDraft] = useState("");

  const lastIdRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);

  // Poll for new messages. since=lastIdRef fetches only what's new.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/matches/${matchId}/chat?since=${lastIdRef.current}`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const rows: ChatMessage[] = await res.json();
        if (rows.length === 0 || cancelled) return;
        const el = listRef.current;
        nearBottomRef.current = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        lastIdRef.current = rows[rows.length - 1].id;
        setMessages((prev) => [...prev, ...rows]);
      } catch {
        // ignore — next poll retries
      }
    };
    void tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [matchId]);

  // Auto-scroll to bottom on new messages, but only if the viewer was already
  // near the bottom (don't yank them away from scrollback they're reading).
  useEffect(() => {
    if (!nearBottomRef.current) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function saveName() {
    const trimmed = nameDraft.trim().slice(0, MAX_LABEL_LEN);
    if (!trimmed) return;
    try {
      localStorage.setItem(GUEST_NAME_KEY, trimmed);
    } catch {}
    setGuestName(trimmed);
  }

  async function send() {
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          loggedInLabel
            ? { body }
            : { body, guestKey, displayName: guestName },
        ),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(typeof j.error === "string" ? j.error : "Message failed to send");
        return;
      }
      setInput("");
    } finally {
      setSending(false);
    }
  }

  const canType = !frozen && (Boolean(loggedInLabel) || Boolean(guestName));

  return (
    <Card className="flex flex-col p-4 gap-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <MessageCircle className="size-4" />
        Live Chat
      </div>

      <div
        ref={listRef}
        className="h-64 overflow-y-auto rounded-md border bg-muted/20 p-2 space-y-1.5"
      >
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            No messages yet. Say something!
          </p>
        )}
        {messages.map((m) => (
          <p key={m.id} className="text-sm break-words">
            <span className="font-semibold">{m.senderLabel}: </span>
            <span className="text-foreground/90">{m.body}</span>
          </p>
        ))}
      </div>

      {frozen ? (
        <p className="text-xs text-muted-foreground text-center">Chat is closed — the match has ended.</p>
      ) : !loggedInLabel && !guestName ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void saveName();
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Pick a display name to chat"
            maxLength={MAX_LABEL_LEN}
            className="h-9"
          />
          <Button type="submit" size="sm" disabled={!nameDraft.trim()}>
            Join chat
          </Button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send a message"
            maxLength={MAX_BODY_LEN}
            disabled={!canType || sending}
            className="h-9"
          />
          <Button type="submit" size="sm" disabled={!canType || sending || !input.trim()}>
            <Send className="size-3.5" />
          </Button>
        </form>
      )}
    </Card>
  );
}
