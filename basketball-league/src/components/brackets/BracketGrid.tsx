"use client";

import { Plus, Volleyball, Trophy, Clock, Trash2 } from "lucide-react";

export type BracketBox = {
  bracketMatchId: number;
  matchId: number;
  roundIndex: number;
  slotIndex: number;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeTeamName: string | null;
  awayTeamName: string | null;
  homeTeamLogo?: boolean;
  awayTeamLogo?: boolean;
  homeTeamColor?: string | null;
  awayTeamColor?: string | null;
  status: string;
  homeScore: number;
  awayScore: number;
  scheduledAt?: string | null;
  venue?: string | null;
  feedsIntoId: number | null;
};

const BOX_W = 250;
const HEADER_H = 26;
const SLOTS_H = 86;
const BOX_H = HEADER_H + SLOTS_H;
const UNIT = 136; // vertical slot for a round-1 box (incl. gap)
const CONNECTOR_W = 44;

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "No date set";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No date set";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  planned: { label: "Planned", cls: "bg-muted text-muted-foreground" },
  scheduled: { label: "Scheduled", cls: "bg-sky-500/15 text-sky-500" },
  started: { label: "Live", cls: "bg-red-500/15 text-red-500" },
  live: { label: "Live", cls: "bg-red-500/15 text-red-500" },
  ended: { label: "Final", cls: "bg-emerald-500/15 text-emerald-500" },
};

function BoxHeader({
  box,
  editable,
  removable,
  onEditMatch,
  onRemoveMatch,
}: {
  box: BracketBox;
  editable?: boolean;
  removable?: boolean;
  onEditMatch?: (box: BracketBox) => void;
  onRemoveMatch?: (box: BracketBox) => void;
}) {
  const st = STATUS_META[box.status] ?? STATUS_META.planned;
  return (
    <div
      className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-2 text-[10px]"
      style={{ height: HEADER_H }}
    >
      <span className="truncate text-muted-foreground">{formatWhen(box.scheduledAt)}</span>
      <span className={`rounded px-1.5 py-px font-medium ${st.cls}`}>{st.label}</span>
      <div className="ml-auto flex items-center gap-1">
        {editable && onEditMatch ? (
          <button
            type="button"
            title="Set date / time"
            onClick={() => onEditMatch(box)}
            className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Clock className="size-3.5" />
          </button>
        ) : null}
        {editable && removable && onRemoveMatch ? (
          <button
            type="button"
            title="Remove match"
            onClick={() => onRemoveMatch(box)}
            className="grid size-5 place-items-center rounded text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

// Shift a hex color toward white (pct > 0) or black (pct < 0) for gradient stops.
function shade(hex: string, pct: number): string {
  const m = hex.replace("#", "");
  if (m.length < 6) return hex;
  const num = parseInt(m, 16);
  const target = pct < 0 ? 0 : 255;
  const p = Math.abs(pct) / 100;
  const mix = (c: number) => Math.round((target - c) * p + c);
  const r = mix((num >> 16) & 255);
  const g = mix((num >> 8) & 255);
  const b = mix(num & 255);
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function teamGradient(hex: string): string {
  return `linear-gradient(135deg, ${shade(hex, 16)} 0%, ${hex} 45%, ${shade(hex, -26)} 100%)`;
}

// Readable foreground for a given background color (WCAG relative luminance).
function textOn(hex: string): string {
  const m = hex.replace("#", "");
  if (m.length < 6) return "#ffffff";
  const ch = (i: number) => {
    const c = parseInt(m.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const lum = 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4);
  return lum < 0.5 ? "#ffffff" : "#0b1120";
}

function roundLabel(roundIndex: number, totalRounds: number): string {
  const fromEnd = totalRounds - 1 - roundIndex;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinals";
  if (fromEnd === 2) return "Quarterfinals";
  return `Round ${roundIndex + 1}`;
}

function TeamLogo({ teamId, hasLogo }: { teamId: number; hasLogo: boolean }) {
  if (hasLogo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/teams/${teamId}/image`}
        alt=""
        className="size-9 shrink-0 rounded-lg object-cover ring-1 ring-black/20"
      />
    );
  }
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-black/15 ring-1 ring-black/20">
      <Volleyball className="size-5 opacity-70" />
    </span>
  );
}

function Slot({
  box,
  slot,
  editable,
  onSlotClick,
}: {
  box: BracketBox;
  slot: "home" | "away";
  editable?: boolean;
  onSlotClick?: (box: BracketBox, slot: "home" | "away") => void;
}) {
  const teamId = slot === "home" ? box.homeTeamId : box.awayTeamId;
  const name = slot === "home" ? box.homeTeamName : box.awayTeamName;
  const hasLogo = slot === "home" ? !!box.homeTeamLogo : !!box.awayTeamLogo;
  const color = (slot === "home" ? box.homeTeamColor : box.awayTeamColor) ?? null;
  const score = slot === "home" ? box.homeScore : box.awayScore;
  const ended = box.status === "ended";
  const other = slot === "home" ? box.awayScore : box.homeScore;
  const isWinner = ended && teamId != null && score > other;

  if (teamId == null) {
    return (
      <button
        type="button"
        disabled={!editable}
        onClick={editable ? () => onSlotClick?.(box, slot) : undefined}
        className={`flex h-1/2 w-full items-center gap-2 px-3 text-left text-[13px] ${
          editable
            ? "cursor-pointer text-primary hover:bg-primary/10"
            : "cursor-default text-muted-foreground/60"
        } ${slot === "home" ? "border-b border-border/60" : ""}`}
      >
        {editable ? <Plus className="size-3.5" /> : null}
        {editable ? "add team" : "TBD"}
      </button>
    );
  }

  const fg = color ? textOn(color) : undefined;
  const styled = !!color;

  return (
    <button
      type="button"
      disabled={!editable}
      onClick={editable ? () => onSlotClick?.(box, slot) : undefined}
      style={styled ? { backgroundImage: teamGradient(color!), color: fg } : undefined}
      className={`flex h-1/2 w-full items-center gap-2.5 px-3 text-left text-[13px] ${
        editable ? "cursor-pointer hover:brightness-110" : "cursor-default"
      } ${slot === "home" ? "border-b border-border/60" : ""} ${
        !styled && isWinner ? "bg-primary/5" : ""
      } ${isWinner ? "font-semibold" : styled ? "" : "text-foreground/85"}`}
    >
      <TeamLogo teamId={teamId} hasLogo={hasLogo} />
      <span className="flex-1 truncate">{name ?? `Team ${teamId}`}</span>
      {ended ? (
        <span
          className="tabular-nums text-sm font-semibold"
          style={fg ? { color: fg } : undefined}
        >
          {score}
        </span>
      ) : null}
      {isWinner ? (
        <Trophy className="size-4 shrink-0" style={{ color: fg ?? "var(--color-primary, #f37021)" }} />
      ) : null}
    </button>
  );
}

// Connector lines between round r (left) and round r+1 (right), using the
// deterministic doubling layout so pair midpoints align with the next box.
function Connector({ leftCount, roundIndex }: { leftCount: number; roundIndex: number }) {
  const H = UNIT * 2 ** roundIndex;
  const pairs = Math.floor(leftCount / 2);
  const height = leftCount * H;
  const mid = CONNECTOR_W / 2;
  const lines = [];
  for (let j = 0; j < pairs; j++) {
    const top = (2 * j + 0.5) * H;
    const bot = (2 * j + 1.5) * H;
    const next = (2 * j + 1) * H;
    lines.push(
      <g key={j} stroke="currentColor" strokeWidth={1.5} fill="none" className="text-border">
        <path d={`M0 ${top} H${mid}`} />
        <path d={`M0 ${bot} H${mid}`} />
        <path d={`M${mid} ${top} V${bot}`} />
        <path d={`M${mid} ${next} H${CONNECTOR_W}`} />
      </g>,
    );
  }
  return (
    <svg width={CONNECTOR_W} height={height} className="shrink-0" style={{ overflow: "visible" }}>
      {lines}
    </svg>
  );
}

export function BracketGrid({
  rounds,
  title,
  editable,
  onSlotClick,
  onAddMatch,
  onEditMatch,
  onRemoveMatch,
}: {
  rounds: BracketBox[][];
  title?: string;
  editable?: boolean;
  onSlotClick?: (box: BracketBox, slot: "home" | "away") => void;
  onAddMatch?: () => void;
  onEditMatch?: (box: BracketBox) => void;
  onRemoveMatch?: (box: BracketBox) => void;
}) {
  const empty = rounds.length === 0 || (rounds[0]?.length ?? 0) === 0;
  const totalRounds = rounds.length;

  return (
    <div className="space-y-4">
      {title ? (
        <div className="flex items-center gap-2.5">
          <Trophy className="size-5 text-primary" />
          <h2 className="font-heading text-lg font-semibold tracking-tight">{title}</h2>
        </div>
      ) : null}

      {empty ? (
        <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
          <p>No matches yet.</p>
          {editable && onAddMatch ? (
            <button
              type="button"
              onClick={onAddMatch}
              className="inline-flex items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-primary hover:bg-primary/10"
            >
              <Plus className="size-4" /> Add first match
            </button>
          ) : null}
        </div>
      ) : (
        <div className="flex items-start overflow-x-auto pb-4">
          {rounds.map((round, r) => {
            const H = UNIT * 2 ** r;
            return (
              <div key={r} className="flex items-start">
                <div className="flex flex-col">
                  <div className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {roundLabel(r, totalRounds)}
                  </div>
                  <div className="flex flex-col">
                    {round.map((box) => {
                      const removable = r === 0 && box.status === "planned";
                      return (
                        <div key={box.bracketMatchId} className="flex items-center justify-center" style={{ height: H }}>
                          <div
                            className="overflow-hidden rounded-xl border bg-card shadow-sm ring-1 ring-black/5"
                            style={{ width: BOX_W, height: BOX_H }}
                          >
                            <BoxHeader
                              box={box}
                              editable={editable}
                              removable={removable}
                              onEditMatch={onEditMatch}
                              onRemoveMatch={onRemoveMatch}
                            />
                            <div className="flex flex-col" style={{ height: SLOTS_H }}>
                              <Slot box={box} slot="home" editable={editable} onSlotClick={onSlotClick} />
                              <Slot box={box} slot="away" editable={editable} onSlotClick={onSlotClick} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {editable && r === 0 && onAddMatch ? (
                      <button
                        type="button"
                        onClick={onAddMatch}
                        className="mx-auto mt-1 inline-flex items-center gap-1 rounded-md border border-dashed px-2.5 py-1 text-xs text-primary hover:bg-primary/10"
                        style={{ width: BOX_W }}
                      >
                        <Plus className="size-3.5" /> add match
                      </button>
                    ) : null}
                  </div>
                </div>
                {r < rounds.length - 1 ? (
                  <div className="flex flex-col">
                    <div className="mb-2 h-[17px]" />
                    <Connector leftCount={round.length} roundIndex={r} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
