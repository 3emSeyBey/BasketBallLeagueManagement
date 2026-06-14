"use client";

import { Plus, Volleyball, Trophy } from "lucide-react";

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
  feedsIntoId: number | null;
};

const BOX_W = 230;
const BOX_H = 86;
const UNIT = 108; // vertical slot for a round-1 box (incl. gap)
const CONNECTOR_W = 44;

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
      style={styled ? { backgroundColor: color!, color: fg } : undefined}
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
}: {
  rounds: BracketBox[][];
  title?: string;
  editable?: boolean;
  onSlotClick?: (box: BracketBox, slot: "home" | "away") => void;
  onAddMatch?: () => void;
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
                    {round.map((box) => (
                      <div key={box.bracketMatchId} className="flex items-center justify-center" style={{ height: H }}>
                        <div
                          className="overflow-hidden rounded-xl border bg-card shadow-sm ring-1 ring-black/5"
                          style={{ width: BOX_W, height: BOX_H }}
                        >
                          <Slot box={box} slot="home" editable={editable} onSlotClick={onSlotClick} />
                          <Slot box={box} slot="away" editable={editable} onSlotClick={onSlotClick} />
                        </div>
                      </div>
                    ))}
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
