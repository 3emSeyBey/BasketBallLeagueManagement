export type MatchStatus =
  | "planned"
  | "scheduled"
  | "started"
  | "live"
  | "ended";

export const MATCH_STATUSES: MatchStatus[] = [
  "planned",
  "scheduled",
  "started",
  "live",
  "ended",
];

/**
 * Compute the user-visible status from the stored status + scheduledAt.
 *
 * - planned/live/ended pass through.
 * - scheduled is promoted to "started" when the current time falls in the
 *   same hour as scheduledAt (and scheduledAt is not in the future by more
 *   than 60 minutes from now).
 */
export function effectiveMatchStatus(
  stored: MatchStatus,
  scheduledAt: string | null,
  now: Date = new Date(),
): MatchStatus {
  if (stored !== "scheduled") return stored;
  if (!scheduledAt) return "planned";
  const start = new Date(scheduledAt);
  if (Number.isNaN(start.getTime())) return stored;
  // Same calendar hour AND same calendar day → "started".
  const sameHour =
    start.getFullYear() === now.getFullYear() &&
    start.getMonth() === now.getMonth() &&
    start.getDate() === now.getDate() &&
    start.getHours() === now.getHours();
  return sameHour ? "started" : stored;
}

export function statusLabel(s: MatchStatus): string {
  switch (s) {
    case "planned":
      return "Planned";
    case "scheduled":
      return "Scheduled";
    case "started":
      return "Starting";
    case "live":
      return "Live";
    case "ended":
      return "Ended";
  }
}
