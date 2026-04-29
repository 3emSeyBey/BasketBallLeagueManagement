"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { ReactNode } from "react";
import type { BracketMatchView } from "@/lib/bracket-query";

const Bracket = dynamic(() => import("react-brackets").then(m => m.Bracket), { ssr: false });

type Props = {
  matches: BracketMatchView[];
  linkBase?: string;
};

type SeedView = {
  id: number;
  date: string;
  status: BracketMatchView["status"];
  teams: { name: string }[];
};

export function BracketView({ matches, linkBase }: Props) {
  if (matches.length === 0) return <p className="text-sm text-muted-foreground">Bracket not yet generated.</p>;

  const roundsMap = new Map<number, BracketMatchView[]>();
  for (const m of matches) {
    if (!roundsMap.has(m.round)) roundsMap.set(m.round, []);
    roundsMap.get(m.round)!.push(m);
  }
  const sortedRounds = Array.from(roundsMap.entries()).sort(([a], [b]) => a - b);

  const roundsForBracket = sortedRounds.map(([round, ms]) => ({
    title: roundTitle(round, sortedRounds.length),
    seeds: ms
      .sort((a, b) => a.position - b.position)
      .map<SeedView>(m => ({
        id: m.id,
        date: new Date(m.scheduledAt).toLocaleDateString(),
        status: m.status,
        teams: [
          { name: teamLabel(m.homeTeam, m.homeScore, m.status) },
          { name: teamLabel(m.awayTeam, m.awayScore, m.status) },
        ],
      })),
  }));

  const renderSeed = ({ seed }: { seed: SeedView }): ReactNode => {
    const card = (
      <div className="text-sm bg-card ring-1 ring-foreground/10 rounded-md overflow-hidden min-w-40">
        <div className="px-3 py-1.5 border-b">{seed.teams[0]?.name ?? "TBD"}</div>
        <div className="px-3 py-1.5">{seed.teams[1]?.name ?? "TBD"}</div>
        <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/40">
          {seed.date} · {seed.status}
        </div>
      </div>
    );
    if (linkBase) {
      return (
        <div className="m-1">
          <Link href={`${linkBase}/${seed.id}`} className="block hover:ring-2 hover:ring-primary/40 rounded-md transition">
            {card}
          </Link>
        </div>
      );
    }
    return <div className="m-1">{card}</div>;
  };

  return (
    <div className="overflow-x-auto">
      <Bracket
        rounds={roundsForBracket}
        roundTitleComponent={(title: string) => (
          <div className="text-xs uppercase tracking-wider text-muted-foreground py-2">{title}</div>
        )}
        renderSeedComponent={renderSeed as never}
      />
    </div>
  );
}

function teamLabel(team: BracketMatchView["homeTeam"], score: number, status: string): string {
  if (!team) return "TBD";
  if (status === "final") return `${team.name} (${score})`;
  return team.name;
}

function roundTitle(round: number, total: number): string {
  const fromEnd = total - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinals";
  if (fromEnd === 2) return "Quarterfinals";
  return `Round ${round}`;
}
