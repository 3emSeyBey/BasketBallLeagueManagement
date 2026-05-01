"use client";

import { MatchBox, type MatchLike } from "./MatchBox";

type BracketSeed = {
  id: number;
  match: MatchLike;
  href?: string;
  onClick?: () => void;
};

const SLOT_REM = 8.5;

export function BracketTree({
  rounds,
}: {
  rounds: { title: string; seeds: BracketSeed[] }[];
}) {
  if (rounds.length === 0) {
    return (
      <p className="text-sm text-muted-foreground border border-dashed border-white/10 rounded-md p-4 text-center">
        No matches yet.
      </p>
    );
  }
  const lastIdx = rounds.length - 1;
  const round1Count = rounds[0]?.seeds.length ?? 1;
  const treeHeight = `${round1Count * SLOT_REM}rem`;

  return (
    <div className="overflow-x-auto -mx-2 px-2 pb-2">
      <div
        className="bracket-tree flex items-stretch min-w-fit"
        style={{ ["--bracket-h" as string]: treeHeight }}
      >
        {rounds.map((r, rIdx) => (
          <div key={rIdx} className="bracket-round">
            <div className="bracket-round-title">{r.title}</div>
            <div className="bracket-matches">
              {r.seeds.map((s, i) => {
                const isOddNotLast = i % 2 === 0 && i < r.seeds.length - 1;
                const drawVbar = rIdx !== lastIdx && isOddNotLast;
                return (
                  <div key={s.id} className="bracket-match">
                    {drawVbar && <span className="bracket-vbar" />}
                    <div className="bracket-match-card">
                      <MatchBox
                        match={s.match}
                        href={s.href}
                        onClick={s.onClick}
                        compact
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
