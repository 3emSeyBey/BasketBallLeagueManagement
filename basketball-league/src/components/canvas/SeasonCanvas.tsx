"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  CanvasView,
  CanvasMatch,
  CanvasDivision,
  CanvasFinals,
} from "@/lib/season-bracket-query";
import { BracketTree } from "@/components/bracket/BracketTree";
import type { MatchLike } from "@/components/bracket/MatchBox";
import { MatchPanel } from "./MatchPanel";
import { AddMatchDialog } from "./AddMatchDialog";
import { AddTeamDialog } from "./AddTeamDialog";

type Props = {
  seasonId: number;
  view: CanvasView;
  availableTeamsForSeason: { id: number; name: string }[];
};

export function SeasonCanvas({
  seasonId,
  view,
  availableTeamsForSeason,
}: Props) {
  const [openMatch, setOpenMatch] = useState<CanvasMatch | null>(null);

  return (
    <div className="space-y-8">
      {view.divisions.map((division) => (
        <DivisionCanvas
          key={division.id}
          seasonId={seasonId}
          division={division}
          availableTeamsForSeason={availableTeamsForSeason}
          onMatchClick={setOpenMatch}
        />
      ))}

      <FinalsCanvas
        seasonId={seasonId}
        finals={view.finals}
        divisionWinners={view.divisions
          .map((d) => d.divisionWinner)
          .filter((t): t is { id: number; name: string } => t !== null)}
        onMatchClick={setOpenMatch}
      />

      <MatchPanel match={openMatch} onClose={() => setOpenMatch(null)} />
    </div>
  );
}

function DivisionCanvas({
  seasonId,
  division,
  availableTeamsForSeason,
  onMatchClick,
}: {
  seasonId: number;
  division: CanvasDivision;
  availableTeamsForSeason: { id: number; name: string }[];
  onMatchClick: (m: CanvasMatch) => void;
}) {
  const teamPickerOptions = division.teams.map((t) => ({
    id: t.team.id,
    name: t.team.name,
    status: t.status,
  }));

  return (
    <Card className="p-6 space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{division.name}</h2>
          <p className="text-xs text-muted-foreground">
            {division.teams.length} teams · pool{" "}
            {division.locked ? "locked" : "open"}
            {division.divisionWinner &&
              ` · winner: ${division.divisionWinner.name}`}
          </p>
        </div>
        <AddTeamDialog
          seasonId={seasonId}
          divisionId={division.id}
          divisionName={division.name}
          availableTeams={availableTeamsForSeason}
        />
      </header>

      <TeamRoster teams={division.teams} />

      <BracketWithControls
        matches={division.matches}
        seasonId={seasonId}
        divisionId={division.id}
        teamOptions={teamPickerOptions}
        onMatchClick={onMatchClick}
      />
    </Card>
  );
}

function FinalsCanvas({
  seasonId,
  finals,
  divisionWinners,
  onMatchClick,
}: {
  seasonId: number;
  finals: CanvasFinals;
  divisionWinners: { id: number; name: string }[];
  onMatchClick: (m: CanvasMatch) => void;
}) {
  const teamOptions =
    finals.teams.length > 0
      ? finals.teams.map((t) => ({
          id: t.team.id,
          name: t.team.name,
          status: t.status,
        }))
      : divisionWinners.map((w) => ({ id: w.id, name: w.name }));

  const showFinals = divisionWinners.length > 0 || finals.matches.length > 0;
  if (!showFinals) return null;

  return (
    <Card className="p-6 space-y-4 ring-2 ring-primary/30">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Finals</h2>
        <p className="text-xs text-muted-foreground">
          {divisionWinners.length} division winner
          {divisionWinners.length === 1 ? "" : "s"} · pool{" "}
          {finals.locked ? "locked" : "open"}
          {finals.championTeam && ` · champion: ${finals.championTeam.name}`}
        </p>
      </header>

      {finals.teams.length > 0 && <TeamRoster teams={finals.teams} />}

      <BracketWithControls
        matches={finals.matches}
        seasonId={seasonId}
        divisionId={null}
        teamOptions={teamOptions}
        onMatchClick={onMatchClick}
      />
    </Card>
  );
}

function BracketWithControls({
  matches,
  seasonId,
  divisionId,
  teamOptions,
  onMatchClick,
}: {
  matches: CanvasMatch[];
  seasonId: number;
  divisionId: number | null;
  teamOptions: { id: number; name: string; status?: string }[];
  onMatchClick: (m: CanvasMatch) => void;
}) {
  const byRound = new Map<number, CanvasMatch[]>();
  for (const m of matches) {
    const arr = byRound.get(m.round) ?? [];
    arr.push(m);
    byRound.set(m.round, arr);
  }
  const sorted = Array.from(byRound.entries()).sort(([a], [b]) => a - b);
  const total = sorted.length;
  const maxRound = sorted.length > 0 ? sorted[sorted.length - 1][0] : 0;

  const rounds = sorted.map(([round, ms]) => ({
    title: roundTitle(round, total, ms),
    seeds: ms
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((m) => ({
        id: m.id,
        match: m as unknown as MatchLike,
        onClick: () => onMatchClick(m),
      })),
  }));

  return (
    <div className="space-y-3">
      {rounds.length > 0 ? (
        <BracketTree rounds={rounds} />
      ) : (
        <p className="text-sm text-muted-foreground border border-dashed border-white/10 rounded-md p-4 text-center">
          No matches yet. Add the first match below.
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-1 border-t border-white/5">
        {sorted.map(([round]) => (
          <AddMatchDialog
            key={round}
            seasonId={seasonId}
            divisionId={divisionId}
            stage={round === 1 ? "pool" : "playoff"}
            round={round}
            triggerLabel={`+ Add to ${roundShort(round, total)}`}
            teamOptions={teamOptions}
          />
        ))}
        <AddMatchDialog
          seasonId={seasonId}
          divisionId={divisionId}
          stage={maxRound === 0 ? "pool" : "playoff"}
          round={maxRound + 1}
          triggerLabel={`+ Add round ${maxRound + 1}`}
          teamOptions={teamOptions}
        />
      </div>
    </div>
  );
}

function TeamRoster({
  teams,
}: {
  teams: { team: { id: number; name: string }; status: string }[];
}) {
  if (teams.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {teams.map((t) => (
        <Badge
          key={t.team.id}
          variant={t.status === "permanent_eliminated" ? "outline" : "secondary"}
        >
          {t.team.name}
          {t.status === "tentative_eliminated" && (
            <span className="ml-1 text-amber-600">⚠</span>
          )}
          {t.status === "permanent_eliminated" && (
            <span className="ml-1 line-through opacity-60">✗</span>
          )}
        </Badge>
      ))}
    </div>
  );
}

function roundTitle(round: number, total: number, ms: CanvasMatch[]): string {
  if (ms.some((m) => m.isSeasonFinal)) return "Championship";
  if (ms.some((m) => m.isDivisionFinal)) return "Division Final";
  const fromEnd = total - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinals";
  if (fromEnd === 2) return "Quarterfinals";
  if (round === 1 && total === 1) return "Match";
  return round === 1 ? "Pool" : `Round ${round}`;
}

function roundShort(round: number, total: number): string {
  const fromEnd = total - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "SF";
  if (fromEnd === 2) return "QF";
  return round === 1 ? "Pool" : `R${round}`;
}
