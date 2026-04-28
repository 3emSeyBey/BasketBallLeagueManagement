"use client";
import { useEffect, useRef, useState } from "react";
import type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";
import { Button } from "@/components/ui/button";

export function StreamHost({ matchId }: { matchId: number }) {
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const tracksRef = useRef<{
    video: ICameraVideoTrack;
    audio: IMicrophoneAudioTrack;
  } | null>(null);
  const videoRef = useRef<HTMLDivElement>(null);

  async function start() {
    setError(null);
    try {
      const res = await fetch(`/api/agora/token?matchId=${matchId}`);
      if (!res.ok) {
        setError("Token request failed");
        return;
      }
      const { appId, channel, token, uid, role } = await res.json();
      if (role !== "publisher") {
        setError("Not authorized to broadcast");
        return;
      }
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      await client.setClientRole("host");
      await client.join(appId, channel, token, uid);
      const [audioTrack, videoTrack] =
        await AgoraRTC.createMicrophoneAndCameraTracks();
      videoTrack.play(videoRef.current!);
      await client.publish([audioTrack, videoTrack]);
      clientRef.current = client;
      tracksRef.current = { video: videoTrack, audio: audioTrack };
      setLive(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to start stream";
      setError(msg);
    }
  }

  async function stop() {
    tracksRef.current?.video.close();
    tracksRef.current?.audio.close();
    await clientRef.current?.leave();
    clientRef.current = null;
    tracksRef.current = null;
    setLive(false);
  }

  useEffect(
    () => () => {
      stop();
    },
    [],
  );

  return (
    <div className="space-y-3">
      <div
        ref={videoRef}
        className="aspect-video bg-black rounded-lg overflow-hidden"
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        {!live ? (
          <Button
            onClick={start}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Go Live
          </Button>
        ) : (
          <Button onClick={stop} variant="destructive">
            End Stream
          </Button>
        )}
      </div>
    </div>
  );
}
