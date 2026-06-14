import { and, asc, count, eq, inArray, isNotNull, ne, or } from "drizzle-orm";
import { db } from "@/db/client";
import { matches, divisions, brackets } from "@/db/schema";
import { loadBracketTree, type BracketBox } from "./bracket-service";

export type ScheduleDivision = { id: number; name: string; bracketId: number | null };

export type ScheduleView = {
  matches: (typeof matches.$inferSelect)[];
  total: number;
  totalPages: number;
  page: number;
  divisions: ScheduleDivision[];
  selectedBracket: { title: string; rounds: BracketBox[][] } | null;
};

// Assemble the schedule page data: matches (filtered by division + paginated),
// the active season's divisions each tagged with their visible default bracket,
// and the selected division's default bracket tree (for the inline view).
export async function loadScheduleView(opts: {
  seasonId: number;
  divisionId: number | null;
  page: number;
  pageSize: number;
  publishedOnly: boolean;
  teamId?: number | null;
  scheduledOnly?: boolean;
}): Promise<ScheduleView> {
  const divs = await db
    .select()
    .from(divisions)
    .where(eq(divisions.seasonId, opts.seasonId))
    .orderBy(asc(divisions.name));
  const divIds = divs.map((d) => d.id);

  const defaultBrackets = divIds.length
    ? await db
        .select({ id: brackets.id, divisionId: brackets.divisionId, isPublished: brackets.isPublished })
        .from(brackets)
        .where(and(inArray(brackets.divisionId, divIds), eq(brackets.isDefault, true)))
    : [];
  const bracketByDiv = new Map(defaultBrackets.map((b) => [b.divisionId, b]));

  const scheduleDivisions: ScheduleDivision[] = divs.map((d) => {
    const b = bracketByDiv.get(d.id);
    const visible = b && (!opts.publishedOnly || b.isPublished);
    return { id: d.id, name: d.name, bracketId: visible ? b!.id : null };
  });

  const conds = [eq(matches.seasonId, opts.seasonId)];
  if (opts.divisionId != null) conds.push(eq(matches.divisionId, opts.divisionId));
  if (opts.teamId != null) {
    conds.push(or(eq(matches.homeTeamId, opts.teamId), eq(matches.awayTeamId, opts.teamId))!);
  }
  // Hide planned placeholder matches with no date; show scheduled/played ones.
  if (opts.scheduledOnly) {
    conds.push(or(ne(matches.status, "planned"), isNotNull(matches.scheduledAt))!);
  }
  const where = and(...conds);

  const total = (await db.select({ c: count() }).from(matches).where(where))[0].c;
  const totalPages = Math.max(1, Math.ceil(total / opts.pageSize));
  const page = Math.min(Math.max(1, opts.page), totalPages);
  const pageMatches = await db
    .select()
    .from(matches)
    .where(where)
    .orderBy(matches.scheduledAt)
    .limit(opts.pageSize)
    .offset((page - 1) * opts.pageSize);

  let selectedBracket: ScheduleView["selectedBracket"] = null;
  if (opts.divisionId != null) {
    const sd = scheduleDivisions.find((d) => d.id === opts.divisionId);
    if (sd?.bracketId) {
      const tree = await loadBracketTree(db, sd.bracketId);
      selectedBracket = { title: tree.bracket.title, rounds: tree.rounds };
    }
  }

  return { matches: pageMatches, total, totalPages, page, divisions: scheduleDivisions, selectedBracket };
}
