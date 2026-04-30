"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  IRemoteAudioTrack,
  IRemoteVideoTrack,
} from "agora-rtc-sdk-ng";
import {
  Loader2,
  Maximize,
  Minimize,
  PictureInPicture2,
  Radio,
  RefreshCw,
  Settings,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Volume2,
  VolumeX,
} from "lucide-react";

type Status = "idle" | "joining" | "live" | "offline";
type QualityChoice = "auto" | "high" | "low";

export function StreamPlayer({ matchId }: { matchId: number }) {
  const [status, setStatus] = useState<Status>("idle");
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [showStats, setShowStats] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [quality, setQuality] = useState<QualityChoice>("auto");
  const [networkQuality, setNetworkQuality] = useState<number>(0);
  const [stats, setStats] = useState<{
    bitrate: number;
    fps: number;
    res: string;
    pktLoss: number;
  } | null>(null);
  const [isFs, setIsFs] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const remoteUidRef = useRef<number | string | null>(null);
  const remoteAudioRef = useRef<IRemoteAudioTrack | null>(null);
  const remoteVideoRef = useRef<IRemoteVideoTrack | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Join channel (with retry trigger).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("joining");
      try {
        const res = await fetch(`/api/agora/token?matchId=${matchId}`);
        if (!res.ok) {
          if (!cancelled) setStatus("offline");
          return;
        }
        const { appId, channel, token, uid } = await res.json();
        const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
        AgoraRTC.setLogLevel(3);
        const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
        await client.setClientRole("audience", { level: 1 });

        client.on("user-published", async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === "video" && user.videoTrack) {
            remoteUidRef.current = user.uid;
            remoteVideoRef.current = user.videoTrack;
            user.videoTrack.play(containerRef.current!, { fit: "contain" });
            setStatus("live");
          }
          if (mediaType === "audio" && user.audioTrack) {
            remoteAudioRef.current = user.audioTrack;
            user.audioTrack.play();
            user.audioTrack.setVolume(muted ? 0 : volume);
          }
        });
        client.on(
          "user-unpublished",
          (user: IAgoraRTCRemoteUser, mediaType) => {
            if (mediaType === "video") {
              if (remoteUidRef.current === user.uid) {
                remoteVideoRef.current = null;
                setStatus("offline");
              }
            }
            if (mediaType === "audio") {
              if (remoteAudioRef.current && user.audioTrack === null) {
                remoteAudioRef.current = null;
              }
            }
          },
        );
        client.on("connection-state-change", (state) => {
          if (state === "DISCONNECTED" || state === "RECONNECTING")
            setStatus((s) => (s === "live" ? "joining" : s));
        });
        client.on("network-quality", (q) => {
          setNetworkQuality(
            Math.max(q.downlinkNetworkQuality, q.uplinkNetworkQuality),
          );
        });

        await client.join(appId, channel, token, uid);
        if (cancelled) {
          await client.leave();
          return;
        }
        clientRef.current = client;
        if (client.remoteUsers.length === 0) setStatus("offline");
      } catch {
        if (!cancelled) setStatus("offline");
      }
    })();
    return () => {
      cancelled = true;
      const c = clientRef.current;
      clientRef.current = null;
      remoteAudioRef.current = null;
      remoteVideoRef.current = null;
      remoteUidRef.current = null;
      void c?.leave();
    };
  }, [matchId, retryToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stats poll.
  useEffect(() => {
    if (status !== "live") return;
    const id = window.setInterval(() => {
      const c = clientRef.current;
      const uid = remoteUidRef.current;
      if (!c || uid === null) return;
      const all = c.getRemoteVideoStats();
      const v = all[uid as keyof typeof all] ?? all[String(uid) as keyof typeof all];
      if (v) {
        setStats({
          bitrate: Math.round((v.receiveBitrate ?? 0) / 1000),
          fps: Math.round(v.receiveFrameRate ?? 0),
          res:
            v.receiveResolutionWidth && v.receiveResolutionHeight
              ? `${v.receiveResolutionWidth}×${v.receiveResolutionHeight}`
              : "—",
          pktLoss: Math.round((v.packetLossRate ?? 0) * 100),
        });
      }
    }, 1500);
    return () => window.clearInterval(id);
  }, [status]);

  // Apply volume / mute to remote audio.
  useEffect(() => {
    remoteAudioRef.current?.setVolume(muted ? 0 : volume);
  }, [volume, muted]);

  // Quality preference (requires host dual-stream).
  useEffect(() => {
    const c = clientRef.current;
    const uid = remoteUidRef.current;
    if (!c || uid === null) return;
    const t: 0 | 1 = quality === "low" ? 1 : 0;
    if (quality === "auto") {
      void c.setStreamFallbackOption?.(uid, 1);
      void c.setRemoteVideoStreamType(uid, 0);
    } else {
      void c.setRemoteVideoStreamType(uid, t);
    }
  }, [quality, status]);

  // Fullscreen state listener.
  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!wrapperRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await wrapperRef.current.requestFullscreen();
    }
  }, []);

  const togglePip = useCallback(async () => {
    const v = containerRef.current?.querySelector("video");
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await v.requestPictureInPicture();
      }
    } catch {}
  }, []);

  const retry = () => {
    setStatus("joining");
    setRetryToken((n) => n + 1);
  };

  const sigIcon = () => {
    if (networkQuality === 0) return null;
    if (networkQuality <= 2)
      return <SignalHigh className="size-3.5 text-emerald-400" />;
    if (networkQuality <= 4)
      return <SignalMedium className="size-3.5 text-amber-400" />;
    return <SignalLow className="size-3.5 text-red-400" />;
  };

  return (
    <div className="space-y-2">
      <div
        ref={wrapperRef}
        className="group/player relative aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/10 shadow-xl"
      >
        <div ref={containerRef} className="absolute inset-0" />

        {/* Top overlay */}
        {status === "live" && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3">
            <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-1 text-[11px] font-bold tracking-wider text-white shadow-lg ring-1 ring-white/20">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-white" />
              </span>
              LIVE
            </div>
            <div className="flex items-center gap-2">
              {sigIcon() && (
                <span className="pointer-events-auto inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[11px] text-white/90 ring-1 ring-white/10">
                  {sigIcon()}
                </span>
              )}
              {showStats && stats && (
                <span className="pointer-events-auto rounded-md bg-black/60 px-2 py-1 text-[11px] font-mono text-white/90 ring-1 ring-white/10">
                  {stats.res} · {stats.fps}fps · {stats.bitrate}kbps
                  {stats.pktLoss > 0 && ` · ${stats.pktLoss}% loss`}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Loading */}
        {status === "joining" && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/60 text-white">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Connecting to stream...
            </div>
          </div>
        )}

        {/* Offline */}
        {status === "offline" && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-gradient-to-br from-zinc-900 to-black text-white">
            <div className="text-center space-y-3">
              <Radio className="mx-auto size-10 opacity-50" />
              <p className="text-sm text-white/80">Stream not active</p>
              <button
                type="button"
                onClick={retry}
                className="inline-flex items-center gap-1.5 rounded-md bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs ring-1 ring-white/15 transition-colors"
              >
                <RefreshCw className="size-3.5" />
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Bottom controls */}
        {status === "live" && (
          <div className="absolute inset-x-0 bottom-0 z-20 translate-y-2 opacity-0 transition-all duration-200 group-hover/player:translate-y-0 group-hover/player:opacity-100 focus-within:translate-y-0 focus-within:opacity-100">
            <div className="bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/10 hover:bg-white/20 text-white ring-1 ring-white/15"
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  {muted || volume === 0 ? (
                    <VolumeX className="size-4" />
                  ) : (
                    <Volume2 className="size-4" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVolume(v);
                    setMuted(v === 0);
                  }}
                  className="h-1 w-24 cursor-pointer accent-primary"
                  aria-label="Volume"
                />
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowMenu((s) => !s)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/10 hover:bg-white/20 text-white ring-1 ring-white/15"
                      aria-label="Settings"
                      aria-expanded={showMenu}
                    >
                      <Settings className="size-4" />
                    </button>
                    {showMenu && (
                      <div className="absolute right-0 bottom-full mb-2 w-48 rounded-lg bg-black/90 p-2 text-xs text-white ring-1 ring-white/10 shadow-xl">
                        <p className="px-2 pt-1 pb-1.5 text-[10px] uppercase tracking-wider text-white/50">
                          Quality
                        </p>
                        {(["auto", "high", "low"] as QualityChoice[]).map(
                          (q) => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => {
                                setQuality(q);
                                setShowMenu(false);
                              }}
                              className={[
                                "block w-full rounded px-2 py-1 text-left hover:bg-white/10",
                                quality === q && "bg-white/10",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              {q === "auto"
                                ? "Auto"
                                : q === "high"
                                  ? "High (HD)"
                                  : "Low (data saver)"}
                            </button>
                          ),
                        )}
                        <div className="my-1 h-px bg-white/10" />
                        <label className="flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-white/10 rounded">
                          <span>Show stats</span>
                          <input
                            type="checkbox"
                            checked={showStats}
                            onChange={(e) => setShowStats(e.target.checked)}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={togglePip}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/10 hover:bg-white/20 text-white ring-1 ring-white/15"
                    aria-label="Picture in picture"
                  >
                    <PictureInPicture2 className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/10 hover:bg-white/20 text-white ring-1 ring-white/15"
                    aria-label={isFs ? "Exit fullscreen" : "Enter fullscreen"}
                  >
                    {isFs ? (
                      <Minimize className="size-4" />
                    ) : (
                      <Maximize className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
