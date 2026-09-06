"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, MessageCircleOff, Send } from "lucide-react";

const POLL_MS = 1500;
const MAX_BODY_LEN = 500;
const MAX_LABEL_LEN = 40;
const GUEST_ID_KEY = "chatGuestId";
const GUEST_NAME_KEY = "chatDisplayName";
// TikTok/FB-Live style: a message sits on screen for a few seconds, then
// fades. No scrollback in the overlay — just the last few lines.
const MESSAGE_LIFETIME_MS = 8000;
const MAX_VISIBLE = 6;

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

// Absolutely-positioned chat surface meant to be nested inside a `relative`
// video container (StreamPlayer / StreamHost). Only mount this while the
// stream itself is on screen — it carries no "frozen" state of its own.
export function ChatOverlay({
  matchId,
  loggedInLabel,
}: {
  matchId: number;
  // Pass the viewer's display name when they're logged in — skips the guest
  // name prompt. Omit for anonymous public viewers.
  loggedInLabel?: string | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [visible, setVisible] = useState(true);
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
  const timersRef = useRef(new Map<number, number>());

  // Poll for new messages. since=lastIdRef fetches only what's new.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/matches/${matchId}/chat?since=${lastIdRef.current}`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const rows: ChatMessage[] = await res.json();
        if (rows.length === 0 || cancelled) return;
        lastIdRef.current = rows[rows.length - 1].id;
        setMessages((prev) => [...prev, ...rows].slice(-MAX_VISIBLE));
        for (const row of rows) {
          const t = window.setTimeout(() => {
            setMessages((prev) => prev.filter((m) => m.id !== row.id));
            timersRef.current.delete(row.id);
          }, MESSAGE_LIFETIME_MS);
          timersRef.current.set(row.id, t);
        }
      } catch {
        // ignore — next poll retries
      }
    };
    void tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      // Intentionally reads the live map (not a snapshot) — we want whatever
      // fade timers exist at unmount time, not the ones from effect setup.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      for (const t of timersRef.current.values()) window.clearTimeout(t);
      timersRef.current.clear();
    };
  }, [matchId]);

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

  const canType = Boolean(loggedInLabel) || Boolean(guestName);

  return (
    <>
      {/* Toggle — always visible, top-right, clear of the LIVE badge/stats. */}
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 z-30 inline-flex size-8 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/15 hover:bg-black/80 transition-colors top-14"
        aria-label={visible ? "Hide chat" : "Show chat"}
        aria-pressed={visible}
      >
        {visible ? <MessageCircleOff className="size-4" /> : <MessageCircle className="size-4" />}
      </button>

      {visible && (
        <div className="pointer-events-none absolute inset-x-0 bottom-14 z-20 flex flex-col justify-end gap-1 px-3 pb-1">
          <div className="flex flex-col gap-1">
            {messages.map((m) => (
              <p
                key={m.id}
                className="w-fit max-w-[85%] animate-in fade-in slide-in-from-bottom-2 rounded-full bg-black/55 px-3 py-1 text-xs text-white shadow break-words"
              >
                <span className="font-semibold">{m.senderLabel}: </span>
                <span className="text-white/90">{m.body}</span>
              </p>
            ))}
          </div>

          <div className="pointer-events-auto mt-1">
            {!loggedInLabel && !guestName ? (
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
                  className="h-8 bg-black/50 text-white placeholder:text-white/50 border-white/20"
                />
                <Button type="submit" size="sm" disabled={!nameDraft.trim()}>
                  Join
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
                  className="h-8 bg-black/50 text-white placeholder:text-white/50 border-white/20"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="secondary"
                  disabled={!canType || sending || !input.trim()}
                  aria-label="Send"
                >
                  <Send className="size-3.5" />
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
