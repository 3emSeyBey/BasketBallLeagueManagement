"use client";

import { Plus } from "lucide-react";

export type BracketBox = {
  bracketMatchId: number;
  matchId: number;
  roundIndex: number;
  slotIndex: number;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeTeamName: string | null;
  awayTeamName: string | null;
  status: string;
  homeScore: number;
  awayScore: number;
  feedsIntoId: number | null;
};

const BOX_W = 184;
const BOX_H = 54;
const UNIT = 74; // vertical slot for a round-1 box (incl. gap)
const CONNECTOR_W = 40;

function roundLabel(roundIndex: number, totalRounds: number): string {
  const fromEnd = totalRounds - 1 - roundIndex;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinals";
  if (fromEnd === 2) return "Quarterfinals";
  return `Round ${roundIndex + 1}`;
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
        className={`flex h-1/2 w-full items-center gap-1.5 px-2.5 text-left text-[13px] ${
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

  return (
    <button
      type="button"
      disabled={!editable}
      onClick={editable ? () => onSlotClick?.(box, slot) : undefined}
      className={`flex h-1/2 w-full items-center justify-between gap-2 px-2.5 text-left text-[13px] ${
        editable ? "cursor-pointer hover:bg-accent/40" : "cursor-default"
      } ${slot === "home" ? "border-b border-border/60" : ""} ${
        isWinner ? "font-semibold text-foreground" : "text-foreground/80"
      }`}
    >
      <span className="truncate">{name ?? `Team ${teamId}`}</span>
      {ended ? (
        <span className={isWinner ? "text-emerald-500" : "text-muted-foreground"}>{score}</span>
      ) : null}
    </button>
  );
}

// Connector lines between round r (left) and round r+1 (right). Uses the
// deterministic doubling layout so pair midpoints line up with the next box.
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
  editable,
  onSlotClick,
  onAddMatch,
}: {
  rounds: BracketBox[][];
  editable?: boolean;
  onSlotClick?: (box: BracketBox, slot: "home" | "away") => void;
  onAddMatch?: () => void;
}) {
  if (rounds.length === 0 || (rounds[0]?.length ?? 0) === 0) {
    return (
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
    );
  }

  const totalRounds = rounds.length;

  return (
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
                      className="overflow-hidden rounded-lg border bg-card shadow-sm"
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
  );
}
