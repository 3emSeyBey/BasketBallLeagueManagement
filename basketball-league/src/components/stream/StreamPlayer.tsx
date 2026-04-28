"use client";
import { useEffect, useRef, useState } from "react";
import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";

export function StreamPlayer({ matchId }: { matchId: number }) {
  const [status, setStatus] = useState<
    "idle" | "joining" | "live" | "offline"
  >("idle");
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("joining");
      try {
        const res = await fetch(`/api/agora/token?matchId=${matchId}`);
        if (!res.ok) {
          setStatus("offline");
          return;
        }
        const { appId, channel, token, uid } = await res.json();
        const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
        const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
        await client.setClientRole("audience");
        client.on(
          "user-published",
          async (user: IAgoraRTCRemoteUser, mediaType) => {
            await client.subscribe(user, mediaType);
            if (mediaType === "video") user.videoTrack?.play(videoRef.current!);
            if (mediaType === "audio") user.audioTrack?.play();
            setStatus("live");
          },
        );
        client.on("user-unpublished", () => setStatus("offline"));
        await client.join(appId, channel, token, uid);
        if (cancelled) await client.leave();
        clientRef.current = client;
      } catch {
        setStatus("offline");
      }
    })();
    return () => {
      cancelled = true;
      clientRef.current?.leave();
    };
  }, [matchId]);

  return (
    <div className="space-y-2">
      <div
        ref={videoRef}
        className="aspect-video bg-black rounded-lg overflow-hidden grid place-items-center text-white text-sm"
      />
      <p className="text-xs text-muted-foreground">
        {status === "joining" && "Connecting..."}
        {status === "live" && (
          <span className="text-primary font-semibold">● LIVE</span>
        )}
        {status === "offline" && "Stream not active"}
      </p>
    </div>
  );
}
