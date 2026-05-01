"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  IAgoraRTCClient,
  ILocalAudioTrack,
  ILocalVideoTrack,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Camera,
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  Monitor,
  Radio,
  RefreshCw,
  Settings,
  Video,
  VideoOff,
} from "lucide-react";

type Source = "camera" | "screen";
type QualityPreset = "480p_1" | "720p_3" | "1080p_2";

const QUALITY_LABELS: Record<QualityPreset, string> = {
  "480p_1": "480p · Low data",
  "720p_3": "720p · Recommended",
  "1080p_2": "1080p · High",
};

export function StreamHost({
  matchId,
  initialStatus,
}: {
  matchId: number;
  initialStatus?: "planned" | "scheduled" | "started" | "live" | "ended";
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"setup" | "starting" | "live">("setup");
  const [error, setError] = useState<string | null>(null);
  const [matchEnded, setMatchEnded] = useState(initialStatus === "ended");
  const [endingMatch, setEndingMatch] = useState(false);

  const isResumable = initialStatus === "live";
  const matchEndedRef = useRef(initialStatus === "ended");

  async function patchStatus(status: "live" | "started" | "ended") {
    try {
      await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        keepalive: true,
      });
    } catch {
      // best-effort
    }
  }

  async function endMatch() {
    if (!confirm("End the match and mark current score as final?")) return;
    setEndingMatch(true);
    if (phase === "live") await teardown();
    setPhase("setup");
    const res = await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ended" }),
    });
    setEndingMatch(false);
    if (!res.ok) {
      toast.error("Failed to end match");
      return;
    }
    matchEndedRef.current = true;
    setMatchEnded(true);
    toast.success("Match ended. Score marked as final.");
    router.refresh();
  }

  const [source, setSource] = useState<Source>("camera");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState<string>("");
  const [micId, setMicId] = useState<string>("");
  const [quality, setQuality] = useState<QualityPreset>("720p_3");
  const [shareSystemAudio, setShareSystemAudio] = useState(true);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [stats, setStats] = useState<{
    bitrate: number;
    fps: number;
    res: string;
  } | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const videoTrackRef = useRef<ILocalVideoTrack | null>(null);
  const micTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const screenAudioRef = useRef<ILocalAudioTrack | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startedAtRef = useRef<number>(0);

  const loadDevices = useCallback(async () => {
    try {
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      // Trigger permission so labels populate.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        stream.getTracks().forEach((t) => t.stop());
      } catch {}
      const [cams, ms] = await Promise.all([
        AgoraRTC.getCameras(),
        AgoraRTC.getMicrophones(),
      ]);
      setCameras(cams);
      setMics(ms);
      setCameraId((prev) => prev || cams[0]?.deviceId || "");
      setMicId((prev) => prev || ms[0]?.deviceId || "");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Device enumeration failed";
      setError(msg);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) await loadDevices();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadDevices]);

  useEffect(() => {
    if (phase !== "live") return;
    const id = window.setInterval(async () => {
      const client = clientRef.current;
      if (!client) return;
      const v = client.getLocalVideoStats();
      setStats({
        bitrate: Math.round((v.sendBitrate ?? 0) / 1000),
        fps: Math.round(v.sendFrameRate ?? 0),
        res:
          v.sendResolutionWidth && v.sendResolutionHeight
            ? `${v.sendResolutionWidth}×${v.sendResolutionHeight}`
            : "—",
      });
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  async function buildVideoTrack(): Promise<{
    video: ILocalVideoTrack;
    extraAudio?: ILocalAudioTrack;
  }> {
    const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
    if (source === "screen") {
      const result = await AgoraRTC.createScreenVideoTrack(
        { encoderConfig: quality },
        shareSystemAudio ? "auto" : "disable",
      );
      if (Array.isArray(result)) {
        return { video: result[0], extraAudio: result[1] };
      }
      return { video: result };
    }
    const cam: ICameraVideoTrack = await AgoraRTC.createCameraVideoTrack({
      cameraId: cameraId || undefined,
      encoderConfig: quality,
    });
    return { video: cam };
  }

  async function start() {
    setError(null);
    setPhase("starting");
    try {
      const res = await fetch(`/api/agora/token?matchId=${matchId}`);
      if (!res.ok) throw new Error("Token request failed");
      const { appId, channel, token, uid, role } = await res.json();
      if (role !== "publisher") throw new Error("Not authorized to broadcast");

      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      AgoraRTC.setLogLevel(3);
      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      await client.setClientRole("host");
      await client.join(appId, channel, token, uid);

      const mic = await AgoraRTC.createMicrophoneAudioTrack({
        microphoneId: micId || undefined,
      });
      const { video, extraAudio } = await buildVideoTrack();

      video.play(containerRef.current!, { fit: "contain" });

      const tracks: (ILocalAudioTrack | ILocalVideoTrack)[] = [mic, video];
      if (extraAudio) tracks.push(extraAudio);
      await client.publish(tracks);
      try {
        await client.enableDualStream();
        await client.setLowStreamParameter({
          width: 320,
          height: 180,
          framerate: 15,
          bitrate: 200,
        });
      } catch {}

      // Detect screen-share end (browser stop button).
      video.on?.("track-ended", () => {
        if (source === "screen") void stop();
      });

      clientRef.current = client;
      videoTrackRef.current = video;
      micTrackRef.current = mic;
      screenAudioRef.current = extraAudio ?? null;
      startedAtRef.current = Date.now();
      setMicOn(true);
      setCamOn(true);
      setPhase("live");
      void patchStatus("live");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to start stream";
      setError(msg);
      setPhase("setup");
      await teardown();
    }
  }

  async function teardown() {
    try {
      if (videoTrackRef.current) {
        videoTrackRef.current.stop();
        videoTrackRef.current.close();
      }
      if (micTrackRef.current) {
        micTrackRef.current.stop();
        micTrackRef.current.close();
      }
      if (screenAudioRef.current) {
        screenAudioRef.current.stop();
        screenAudioRef.current.close();
      }
      await clientRef.current?.leave();
    } catch {}
    videoTrackRef.current = null;
    micTrackRef.current = null;
    screenAudioRef.current = null;
    clientRef.current = null;
    setStats(null);
  }

  async function stop() {
    await teardown();
    setPhase("setup");
    if (!matchEndedRef.current) void patchStatus("started");
  }

  async function switchSource(next: Source) {
    if (phase !== "live" || next === source) {
      setSource(next);
      return;
    }
    const client = clientRef.current;
    if (!client) return;
    try {
      const old = videoTrackRef.current;
      const oldExtra = screenAudioRef.current;
      const previous = source;
      setSource(next);
      const built = await (async () => {
        const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
        if (next === "screen") {
          const r = await AgoraRTC.createScreenVideoTrack(
            { encoderConfig: quality },
            shareSystemAudio ? "auto" : "disable",
          );
          return Array.isArray(r)
            ? { video: r[0], extraAudio: r[1] }
            : { video: r };
        }
        return {
          video: await AgoraRTC.createCameraVideoTrack({
            cameraId: cameraId || undefined,
            encoderConfig: quality,
          }),
        };
      })();
      if (old) {
        await client.unpublish([old]);
        old.stop();
        old.close();
      }
      if (oldExtra) {
        await client.unpublish([oldExtra]);
        oldExtra.stop();
        oldExtra.close();
      }
      built.video.play(containerRef.current!, { fit: "contain" });
      const toPublish: (ILocalAudioTrack | ILocalVideoTrack)[] = [built.video];
      if (built.extraAudio) toPublish.push(built.extraAudio);
      await client.publish(toPublish);
      built.video.on?.("track-ended", () => {
        if (next === "screen") void stop();
      });
      videoTrackRef.current = built.video;
      screenAudioRef.current = built.extraAudio ?? null;
      setCamOn(true);
      void previous;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Source switch failed";
      setError(msg);
    }
  }

  async function toggleMic() {
    const t = micTrackRef.current;
    if (!t) return;
    const next = !micOn;
    await t.setEnabled(next);
    setMicOn(next);
  }

  async function toggleCam() {
    const t = videoTrackRef.current;
    if (!t || source !== "camera") return;
    const next = !camOn;
    await t.setEnabled(next);
    setCamOn(next);
  }

  async function changeCameraDevice(id: string) {
    setCameraId(id);
    if (phase !== "live" || source !== "camera") return;
    const t = videoTrackRef.current as ICameraVideoTrack | null;
    try {
      await t?.setDevice(id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Camera switch failed";
      setError(msg);
    }
  }

  async function changeMicDevice(id: string) {
    setMicId(id);
    if (phase !== "live") return;
    try {
      await micTrackRef.current?.setDevice(id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Mic switch failed";
      setError(msg);
    }
  }

  async function changeQuality(q: QualityPreset) {
    setQuality(q);
    if (phase !== "live") return;
    try {
      await videoTrackRef.current?.setEncoderConfiguration(q);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Quality change failed";
      setError(msg);
    }
  }

  useEffect(
    () => () => {
      void teardown();
    },
    [],
  );

  // Revert match status to "started" if the host closes/refreshes mid-stream.
  useEffect(() => {
    if (phase !== "live") return;
    const handler = () => {
      if (matchEndedRef.current) return;
      try {
        const blob = new Blob([JSON.stringify({ status: "started" })], {
          type: "application/json",
        });
        // Use fetch with keepalive (sendBeacon would only do POST).
        void fetch(`/api/matches/${matchId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: blob,
          keepalive: true,
        });
      } catch {
        // best-effort
      }
    };
    window.addEventListener("beforeunload", handler);
    window.addEventListener("pagehide", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      window.removeEventListener("pagehide", handler);
    };
  }, [phase, matchId]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-0 -m-px rounded-xl bg-gradient-to-br from-primary/40 via-fuchsia-500/20 to-cyan-500/30 blur-sm opacity-60 pointer-events-none" />
        <div
          ref={containerRef}
          className="relative aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/10"
        >
          {phase !== "live" && (
            <div className="absolute inset-0 grid place-items-center text-white/70">
              {phase === "starting" ? (
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  Starting broadcast...
                </div>
              ) : (
                <div className="text-center space-y-1">
                  <Radio className="mx-auto size-8 opacity-60" />
                  <p className="text-sm">Preview will appear here once live</p>
                </div>
              )}
            </div>
          )}

          {phase === "live" && (
            <>
              <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-1 text-[11px] font-bold tracking-wider text-white shadow-lg ring-1 ring-white/20">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-white" />
                </span>
                LIVE
              </div>
              <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                <span className="rounded-md bg-black/60 px-2 py-1 text-[11px] font-mono text-white/90 ring-1 ring-white/10">
                  {formatTime(elapsed)}
                </span>
                {stats && (
                  <span className="rounded-md bg-black/60 px-2 py-1 text-[11px] font-mono text-white/90 ring-1 ring-white/10">
                    {stats.res} · {stats.fps}fps · {stats.bitrate}kbps
                  </span>
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleMic}
                    className={iconBtn(micOn)}
                    aria-label={micOn ? "Mute mic" : "Unmute mic"}
                  >
                    {micOn ? (
                      <Mic className="size-4" />
                    ) : (
                      <MicOff className="size-4" />
                    )}
                  </button>
                  {source === "camera" && (
                    <button
                      type="button"
                      onClick={toggleCam}
                      className={iconBtn(camOn)}
                      aria-label={camOn ? "Stop camera" : "Start camera"}
                    >
                      {camOn ? (
                        <Video className="size-4" />
                      ) : (
                        <VideoOff className="size-4" />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      switchSource(source === "camera" ? "screen" : "camera")
                    }
                    className={iconBtn(true)}
                    aria-label="Switch source"
                  >
                    {source === "camera" ? (
                      <Monitor className="size-4" />
                    ) : (
                      <Camera className="size-4" />
                    )}
                    <span className="ml-1.5 text-xs">
                      {source === "camera" ? "Share screen" : "Use camera"}
                    </span>
                  </button>
                  <div className="ml-auto" />
                  <Button onClick={stop} variant="destructive" size="sm">
                    End Stream
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {phase === "setup" && isResumable && !matchEnded && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-2 text-sm">
          <p className="font-semibold text-amber-200">
            Match is marked Live but the broadcast is not active.
          </p>
          <p className="text-amber-200/80 text-xs">
            Resume to reattach to the existing channel and continue
            streaming, or pause to revert status to Starting.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              onClick={start}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Radio className="mr-1.5 size-4" />
              Resume Live Stream
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void patchStatus("started")}
            >
              Mark as Starting
            </Button>
          </div>
        </div>
      )}

      {phase === "setup" && (
        <div className="rounded-xl border bg-card/50 p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Settings className="size-4" />
            Broadcast setup
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Source</p>
            <div className="grid grid-cols-2 gap-2">
              <SourceTile
                active={source === "camera"}
                onClick={() => setSource("camera")}
                icon={<Camera className="size-5" />}
                label="Camera"
                hint="Webcam or capture device"
              />
              <SourceTile
                active={source === "screen"}
                onClick={() => setSource("screen")}
                icon={<Monitor className="size-5" />}
                label="Screen / Window"
                hint="OBS, display, browser tab"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {source === "camera" && (
              <Field label="Camera">
                <select
                  className={selectCls}
                  value={cameraId}
                  onChange={(e) => setCameraId(e.target.value)}
                >
                  {cameras.length === 0 && (
                    <option value="">No cameras detected</option>
                  )}
                  {cameras.map((c) => (
                    <option key={c.deviceId} value={c.deviceId}>
                      {c.label || `Camera ${c.deviceId.slice(0, 6)}`}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Microphone">
              <select
                className={selectCls}
                value={micId}
                onChange={(e) => setMicId(e.target.value)}
              >
                {mics.length === 0 && (
                  <option value="">No microphones detected</option>
                )}
                {mics.map((m) => (
                  <option key={m.deviceId} value={m.deviceId}>
                    {m.label || `Mic ${m.deviceId.slice(0, 6)}`}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Quality">
              <select
                className={selectCls}
                value={quality}
                onChange={(e) =>
                  setQuality(e.target.value as QualityPreset)
                }
              >
                {(Object.keys(QUALITY_LABELS) as QualityPreset[]).map((q) => (
                  <option key={q} value={q}>
                    {QUALITY_LABELS[q]}
                  </option>
                ))}
              </select>
            </Field>
            {source === "screen" && (
              <Field label="Screen audio">
                <label className="flex items-center gap-2 text-sm h-9 px-3 rounded-md border bg-background">
                  <input
                    type="checkbox"
                    checked={shareSystemAudio}
                    onChange={(e) => setShareSystemAudio(e.target.checked)}
                  />
                  Capture system / tab audio
                </label>
              </Field>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={start}
              disabled={phase !== "setup"}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Radio className="mr-1.5 size-4" />
              Go Live
            </Button>
            <Button variant="outline" size="sm" onClick={loadDevices}>
              <RefreshCw className="mr-1.5 size-3.5" />
              Refresh devices
            </Button>
          </div>
        </div>
      )}

      {!matchEnded && (
        <div className="flex items-center justify-end">
          <Button
            type="button"
            onClick={endMatch}
            disabled={endingMatch}
            variant="destructive"
            size="lg"
            className="gap-2"
          >
            <CheckCircle2 className="size-4" />
            {endingMatch ? "Ending…" : "End Match"}
          </Button>
        </div>
      )}
      {matchEnded && (
        <p className="text-sm text-muted-foreground text-center">
          Match ended. Score is final.
        </p>
      )}

      {phase === "live" && (
        <div className="rounded-xl border bg-card/50 p-3 grid gap-3 sm:grid-cols-3">
          {source === "camera" && (
            <Field label="Camera">
              <select
                className={selectCls}
                value={cameraId}
                onChange={(e) => changeCameraDevice(e.target.value)}
              >
                {cameras.map((c) => (
                  <option key={c.deviceId} value={c.deviceId}>
                    {c.label || `Camera ${c.deviceId.slice(0, 6)}`}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Microphone">
            <select
              className={selectCls}
              value={micId}
              onChange={(e) => changeMicDevice(e.target.value)}
            >
              {mics.map((m) => (
                <option key={m.deviceId} value={m.deviceId}>
                  {m.label || `Mic ${m.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quality">
            <select
              className={selectCls}
              value={quality}
              onChange={(e) => changeQuality(e.target.value as QualityPreset)}
            >
              {(Object.keys(QUALITY_LABELS) as QualityPreset[]).map((q) => (
                <option key={q} value={q}>
                  {QUALITY_LABELS[q]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}

function SourceTile({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-lg border p-3 text-left transition-colors",
        active
          ? "border-primary bg-primary/5 ring-2 ring-primary/40"
          : "hover:bg-accent/40",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 font-medium">
        {icon}
        {label}
      </div>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </button>
  );
}

const selectCls =
  "h-9 w-full rounded-md border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function iconBtn(on: boolean) {
  return [
    "inline-flex items-center justify-center h-9 min-w-9 px-2.5 rounded-md text-white transition-colors ring-1",
    on
      ? "bg-white/10 hover:bg-white/20 ring-white/20"
      : "bg-red-600/80 hover:bg-red-600 ring-red-300/30",
  ].join(" ");
}

function formatTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${sec}` : `${m}:${sec}`;
}
