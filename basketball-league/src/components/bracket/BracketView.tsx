"use client";

import type { BracketMatchView } from "@/lib/bracket-query";
import { BracketTree } from "./BracketTree";
import type { MatchLike } from "./MatchBox";

type Props = {
  matches: BracketMatchView[];
  linkBase?: string;
};

export function BracketView({ matches, linkBase }: Props) {
  if (matches.length === 0) {
    return (
      <p className="text-sm text-muted-foreground border border-dashed border-white/10 rounded-md p-4 text-center">
        Bracket not yet generated.
      </p>
    );
  }

  const roundsMap = new Map<number, BracketMatchView[]>();
  for (const m of matches) {
    if (!roundsMap.has(m.round)) roundsMap.set(m.round, []);
    roundsMap.get(m.round)!.push(m);
  }
  const sortedRounds = Array.from(roundsMap.entries()).sort(
    ([a], [b]) => a - b,
  );
  const total = sortedRounds.length;

  const rounds = sortedRounds.map(([round, ms]) => ({
    title: roundTitle(round, total),
    seeds: ms
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((m) => ({
        id: m.id,
        href: linkBase ? `${linkBase}/${m.id}` : undefined,
        match: toMatchLike(m, total === round),
      })),
  }));

  return <BracketTree rounds={rounds} />;
}

function toMatchLike(m: BracketMatchView, isFinal: boolean): MatchLike {
  return {
    id: m.id,
    homeTeam: m.homeTeam ? { id: m.homeTeam.id, name: m.homeTeam.name } : null,
    awayTeam: m.awayTeam ? { id: m.awayTeam.id, name: m.awayTeam.name } : null,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    status: m.status,
    scheduledAt: m.scheduledAt,
    isSeasonFinal: isFinal,
  };
}

function roundTitle(round: number, total: number): string {
  const fromEnd = total - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinals";
  if (fromEnd === 2) return "Quarterfinals";
  return `Round ${round}`;
}
