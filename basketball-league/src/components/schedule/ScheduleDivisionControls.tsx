"use client";

import { useRouter } from "next/navigation";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// Division filter for the schedule. Navigates basePath?division=ID (or basePath
// for "All"), resetting pagination.
export function ScheduleDivisionControls({
  divisions,
  selected,
  basePath,
}: {
  divisions: { id: number; name: string }[];
  selected: string; // "all" or a division id (string)
  basePath: string;
}) {
  const router = useRouter();

  function go(value: string | null) {
    const v = value ?? "all";
    router.push(v === "all" ? basePath : `${basePath}?division=${v}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-muted-foreground">Division</label>
      <Select value={selected} onValueChange={go}>
        <SelectTrigger className="w-52">
          <SelectValue placeholder="All divisions">
            {(v: string) =>
              v === "all" || !v
                ? "All divisions"
                : divisions.find((d) => String(d.id) === v)?.name ?? "All divisions"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All divisions</SelectItem>
          {divisions.map((d) => (
            <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
