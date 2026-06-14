import { Card } from "@/components/ui/card";
import { BracketGrid, type BracketBox } from "@/components/brackets/BracketGrid";
import { ExportBracketButton } from "@/components/brackets/ExportBracketButton";
import { DivisionBracketModal } from "./DivisionBracketModal";

// Bracket area above the schedule table. A specific division shows its default
// bracket inline (with PNG export); "All" shows a button that opens a
// per-division bracket modal.
export function ScheduleBracketSection({
  divisionId,
  selectedBracket,
  divisions,
  season,
}: {
  divisionId: number | null;
  selectedBracket: { title: string; rounds: BracketBox[][] } | null;
  divisions: { id: number; name: string; bracketId: number | null }[];
  season: string | null;
}) {
  if (divisionId == null) {
    return <DivisionBracketModal divisions={divisions} season={season} />;
  }
  if (!selectedBracket) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        No published bracket for this division yet.
      </div>
    );
  }
  const divisionName = divisions.find((d) => d.id === divisionId)?.name ?? null;
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{selectedBracket.title}</h2>
        <ExportBracketButton
          title={selectedBracket.title}
          season={season}
          division={divisionName}
          rounds={selectedBracket.rounds}
        />
      </div>
      <div className="rounded-lg border bg-muted/20 p-4">
        <BracketGrid rounds={selectedBracket.rounds} />
      </div>
    </Card>
  );
}
