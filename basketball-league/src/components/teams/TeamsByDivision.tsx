"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TeamCard } from "@/components/teams/TeamCard";
import { DivisionTitle } from "@/components/divisions/DivisionTitle";

export type DivisionGroup = {
  divId: number | null;
  divName: string;
  teams: { id: number; name: string; division: string; imageMimeType: string | null; createdAt: string }[];
};

export function TeamsByDivision({
  groups,
  isAdmin,
  linkPrefix = "/teams",
}: {
  groups: DivisionGroup[];
  isAdmin: boolean;
  linkPrefix?: string;
}) {
  const [selected, setSelected] = useState<string>(groups[0]?.divName ?? "");

  if (groups.length === 0) {
    return (
      <Card className="p-10 text-center text-muted-foreground">
        <p>No divisions yet.</p>
        {isAdmin && <p className="text-sm mt-1">Add a division to get started.</p>}
      </Card>
    );
  }

  const group = groups.find((g) => g.divName === selected) ?? groups[0];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <label className="text-sm text-muted-foreground">Division</label>
        <Select value={group.divName} onValueChange={(v) => setSelected(v ?? "")}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Pick a division" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((g) => (
              <SelectItem key={g.divName} value={g.divName}>
                {g.divName} ({g.teams.length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="size-2 rounded-full bg-primary shadow-[0_0_12px_rgba(243,112,33,0.7)]" />
            {group.divId != null ? (
              <DivisionTitle id={group.divId} name={group.divName} canEdit={isAdmin} />
            ) : (
              <h2 className="text-xl font-semibold tracking-tight">{group.divName}</h2>
            )}
            <span className="text-xs text-muted-foreground">
              {group.teams.length} team{group.teams.length === 1 ? "" : "s"}
            </span>
          </div>
          {isAdmin && (
            <Link
              href={`/teams/new?division=${encodeURIComponent(group.divName)}`}
              className={buttonVariants({
                size: "sm",
                className: "bg-primary text-primary-foreground hover:bg-primary/90",
              })}
            >
              <Plus className="size-4 mr-1.5" />
              Register Team
            </Link>
          )}
        </div>
        {group.teams.length === 0 ? (
          <p className="text-sm text-muted-foreground border border-dashed rounded-md p-4 text-center">
            No teams in this division yet.
            {isAdmin && (
              <>
                {" "}
                <Link
                  href={`/teams/new?division=${encodeURIComponent(group.divName)}`}
                  className="text-primary hover:underline"
                >
                  Register the first team
                </Link>
                .
              </>
            )}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.teams.map((t) => (
              <TeamCard key={t.id} team={t} linkPrefix={linkPrefix} showDivision={false} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
