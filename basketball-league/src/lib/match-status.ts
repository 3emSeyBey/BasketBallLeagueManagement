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
 *   same hour as scheduledAt.
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
  const sameHour =
    start.getFullYear() === now.getFullYear() &&
    start.getMonth() === now.getMonth() &&
    start.getDate() === now.getDate() &&
    start.getHours() === now.getHours();
  return sameHour ? "started" : stored;
}

/**
 * True when scheduledAt falls on the current calendar day. Used by admin
 * surfaces to unlock the broadcaster panel before the official start hour.
 */
export function isSameMatchDay(
  scheduledAt: string | null,
  now: Date = new Date(),
): boolean {
  if (!scheduledAt) return false;
  const start = new Date(scheduledAt);
  if (Number.isNaN(start.getTime())) return false;
  return (
    start.getFullYear() === now.getFullYear() &&
    start.getMonth() === now.getMonth() &&
    start.getDate() === now.getDate()
  );
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
