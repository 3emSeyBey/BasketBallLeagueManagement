import { RtcTokenBuilder, RtcRole } from "agora-token";

export function buildRtcToken(
  channel: string,
  uid: number,
  role: "publisher" | "subscriber",
): string {
  const appId = process.env.AGORA_APP_ID!;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE!;
  if (!appId || !appCertificate)
    throw new Error("AGORA_APP_ID / AGORA_APP_CERTIFICATE not set");
  const expirationTimeInSeconds = 60 * 60; // 1h
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
  return RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channel,
    uid,
    role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER,
    privilegeExpiredTs,
    privilegeExpiredTs,
  );
}
