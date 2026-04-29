"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  CanvasView, CanvasMatch, CanvasDivision, CanvasFinals,
} from "@/lib/season-bracket-query";
import { MatchCard } from "./MatchCard";
import { MatchPanel } from "./MatchPanel";
import { AddMatchDialog } from "./AddMatchDialog";
import { AddTeamDialog } from "./AddTeamDialog";

type Props = {
  seasonId: number;
  view: CanvasView;
  availableTeamsForSeason: { id: number; name: string }[];
};

export function SeasonCanvas({ seasonId, view, availableTeamsForSeason }: Props) {
  const [openMatch, setOpenMatch] = useState<CanvasMatch | null>(null);

  return (
    <div className="space-y-8">
      {view.divisions.map(division => (
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
          .map(d => d.divisionWinner)
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
  const matchesByColumn = useMemo(() => groupByColumn(division.matches), [division.matches]);
  const columns = Object.keys(matchesByColumn).map(Number).sort((a, b) => a - b);
  if (columns.length === 0) columns.push(1); // always render Pool column even when empty
  const maxRound = columns[columns.length - 1] ?? 1;

  const teamPickerOptions = division.teams.map(t => ({
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
            {division.teams.length} teams · pool {division.locked ? "locked" : "open"}
            {division.divisionWinner && ` · winner: ${division.divisionWinner.name}`}
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

      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-fit pb-2">
          {columns.map(col => (
            <Column
              key={col}
              title={columnTitle(col, maxRound)}
              matches={matchesByColumn[col] ?? []}
              onMatchClick={onMatchClick}
              addAction={
                <AddMatchDialog
                  seasonId={seasonId}
                  divisionId={division.id}
                  stage={col === 1 ? "pool" : "playoff"}
                  round={col}
                  triggerLabel="+ Add match"
                  teamOptions={teamPickerOptions}
                />
              }
            />
          ))}
          <ColumnAdder
            nextRound={maxRound + 1}
            seasonId={seasonId}
            divisionId={division.id}
            teamOptions={teamPickerOptions}
          />
        </div>
      </div>
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
  const matchesByColumn = useMemo(() => groupByColumn(finals.matches), [finals.matches]);
  const columns = Object.keys(matchesByColumn).map(Number).sort((a, b) => a - b);
  if (columns.length === 0) columns.push(1);
  const maxRound = columns[columns.length - 1] ?? 1;

  const teamOptions = finals.teams.length > 0
    ? finals.teams.map(t => ({ id: t.team.id, name: t.team.name, status: t.status }))
    : divisionWinners.map(w => ({ id: w.id, name: w.name }));

  const showFinals = divisionWinners.length > 0 || finals.matches.length > 0;
  if (!showFinals) return null;

  return (
    <Card className="p-6 space-y-4 ring-2 ring-primary/30">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Finals</h2>
        <p className="text-xs text-muted-foreground">
          {divisionWinners.length} division winner{divisionWinners.length === 1 ? "" : "s"} · pool {finals.locked ? "locked" : "open"}
          {finals.championTeam && ` · champion: ${finals.championTeam.name}`}
        </p>
      </header>

      {finals.teams.length > 0 && <TeamRoster teams={finals.teams} />}

      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-fit pb-2">
          {columns.map(col => (
            <Column
              key={col}
              title={columnTitle(col, maxRound)}
              matches={matchesByColumn[col] ?? []}
              onMatchClick={onMatchClick}
              addAction={
                <AddMatchDialog
                  seasonId={seasonId}
                  divisionId={null}
                  stage={col === 1 ? "pool" : "playoff"}
                  round={col}
                  triggerLabel="+ Add match"
                  teamOptions={teamOptions}
                />
              }
            />
          ))}
          <ColumnAdder
            nextRound={maxRound + 1}
            seasonId={seasonId}
            divisionId={null}
            teamOptions={teamOptions}
          />
        </div>
      </div>
    </Card>
  );
}

function Column({
  title,
  matches,
  onMatchClick,
  addAction,
}: {
  title: string;
  matches: CanvasMatch[];
  onMatchClick: (m: CanvasMatch) => void;
  addAction: React.ReactNode;
}) {
  return (
    <div className="w-64 shrink-0 space-y-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground px-1">{title}</p>
      <div className="space-y-2">
        {matches.map(m => (
          <MatchCard key={m.id} match={m} onClick={() => onMatchClick(m)} />
        ))}
      </div>
      {addAction}
    </div>
  );
}

function ColumnAdder({
  nextRound,
  seasonId,
  divisionId,
  teamOptions,
}: {
  nextRound: number;
  seasonId: number;
  divisionId: number | null;
  teamOptions: { id: number; name: string; status?: string }[];
}) {
  return (
    <div className="w-64 shrink-0 space-y-3 border border-dashed rounded-md p-3 text-center">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Round {nextRound}</p>
      <p className="text-xs text-muted-foreground">Empty</p>
      <AddMatchDialog
        seasonId={seasonId}
        divisionId={divisionId}
        stage="playoff"
        round={nextRound}
        triggerLabel={`+ Add to round ${nextRound}`}
        teamOptions={teamOptions}
      />
    </div>
  );
}

function TeamRoster({ teams }: { teams: { team: { id: number; name: string }; status: string }[] }) {
  if (teams.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {teams.map(t => (
        <Badge key={t.team.id} variant={t.status === "permanent_eliminated" ? "outline" : "secondary"}>
          {t.team.name}
          {t.status === "tentative_eliminated" && <span className="ml-1 text-amber-600">⚠</span>}
          {t.status === "permanent_eliminated" && <span className="ml-1 line-through opacity-60">✗</span>}
        </Badge>
      ))}
    </div>
  );
}

function groupByColumn(ms: CanvasMatch[]): Record<number, CanvasMatch[]> {
  const out: Record<number, CanvasMatch[]> = {};
  for (const m of ms) {
    const col = m.round;
    if (!out[col]) out[col] = [];
    out[col].push(m);
  }
  return out;
}

function columnTitle(col: number, total: number): string {
  if (col === 1) return "Pool";
  const fromEnd = total - col;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinals";
  return `Round ${col}`;
}
