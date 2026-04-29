# Flexible Bracket Redesign — Design Spec

**Date:** 2026-04-29
**Status:** Approved (rules) — implementation pending

## Goal

Replace the current fixed-shape single-elimination bracket with an elastic, division-based, admin-driven bracket system that supports rolling team registration and a forgiveness window for round-1 losers.

## Non-Goals

- Standings auto-seeding (admin places teams manually).
- Importing existing bracket data into the new model — `Season 2025` and `Season 2026` will be re-seeded.
- Mobile-optimized bracket canvas (desktop-first; mobile viewable but read-only).
- Round naming customization (we will hardcode the labels — see UI section).

## Glossary

- **Pool** — the leftmost column of a division's bracket (formerly "round 1"). Elastic; new teams enter here. Losers are tentatively eliminated but can be revived.
- **Round 2+** — subsequent columns within a division. Each column's contents derive from the previous column's winners + admin promotions.
- **Division Final** — the last match within a division's bracket; produces a Division Winner.
- **Finals** — a season-level bracket that opens once at least one Division Winner has been declared. Behaves identically to a per-division bracket: a pool, optional rounds, eventual single champion. With 2 divisions it's typically a single match. With 3+ divisions it's another elastic bracket.

## Domain Rules

### Team registration

1. A team is added to a season via an admin action that picks `(team, division)`. New teams always enter that division's pool.
2. New teams cannot be placed directly into round 2+ at creation.
3. Once added, a team stays associated with that division for the season. Re-assignment to another division mid-season is out of scope.

### Match composition

4. The admin composes matches by placing two teams into a match in any column. There is no auto-pairing — match creation is always an explicit admin action via the canvas UI's "+ Add" button per column.
5. A team can sit alone in an "open" match slot waiting for an opponent. The slot is a real DB row with one team set and the other null.
6. **No rematch:** two teams cannot be matched twice in the same season (across all stages including Finals).

### Advancement and elimination

7. The winner of any match is the team selected after a match goes `final`. Winners advance only by the admin manually placing them in a higher-round match. There is no automatic next-match wiring.
8. Round-1 (pool) losers are flagged `tentatively_eliminated`. The admin can revive a tentatively-eliminated team by composing a new pool match for them.
9. A team in any round ≥2 that loses is `permanently_eliminated`. No revival.
10. **Solidification trigger:** for each division, eliminations lock when the earliest-scheduled round-2 match in that division reaches its scheduled time (`scheduled_at <= now()`), regardless of whether the match has actually started or is being live-streamed. After this point, all `tentatively_eliminated` teams in that division become `permanently_eliminated`. The pool stops accepting revivals.
11. Lock state is **derived**, not stored. The system computes it at request time by comparing `min(round2.scheduled_at)` against the current time. Rescheduling a round-2 match earlier or later changes when the lock kicks in.

### Division winner & Finals

12. A division winner is declared when the admin marks a match as the Division Final and that match goes `final`. Practical rule: only one match in a division may be flagged `is_division_final = true` at a time, and its winner becomes the Division Winner.
13. Once a division has a winner, the system enables a Finals stage at the season level. Finals begins life as a pool just like any division.
14. Finals follows all the same rules: round 1 = pool with revivable losers, round-2 trigger locks pool eliminations, no rematches, no auto-advancement.
15. **Manual elimination at Finals.** Admin can explicitly eliminate any losing team in Finals (overriding the tentative/locked state). This is an admin-only override exposed in the Finals canvas.
16. The season ends when the admin marks a Finals match as the **Season Final** and it goes `final`.

## Data Model

### Existing tables to keep

- `seasons` — unchanged.
- `divisions` — already exists, scoped to a season.
- `teams`, `users`, `players`, `announcements`, `announcement_images` — unchanged.

### Existing tables to modify

#### `season_teams`

Add a `division_id` FK so each season-team row knows which division it joined.

```ts
season_teams: {
  ...existing,
  division_id: integer FK divisions.id ON DELETE SET NULL  // nullable during migration; required for new entries
}
```

- Drop the `seed` column or stop using it. New rows ignore it. Old rows keep their values to avoid breaking the migration. (Soft-deprecation for now; physical drop in a follow-up.)

#### `matches`

Add columns to support the new model. Most existing bracket columns are deprecated.

```ts
matches: {
  ...existing,
  division_id: integer FK divisions.id ON DELETE SET NULL  // null for non-bracket / legacy matches
  stage: text enum ['pool','playoff','final']  // 'pool' = round 1 of division or finals; 'playoff' = round 2+; 'final' = the match flagged as season final
  is_division_final: integer (boolean) default 0  // exactly one per division at most
  is_season_final: integer (boolean) default 0    // exactly one per season at most
}
```

- Deprecate (do not drop yet): `bracket_position`, `next_match_id`, `next_match_slot`. New code stops writing them; legacy data keeps them.
- `round` still useful as a column index within a division (1 = pool, 2 = playoff column 1, etc.). New code uses it as a render-order hint; not as a structural pointer.

### New table: `team_eliminations` (optional)

Two viable approaches; pick one.

**Option A (recommended):** Compute elimination state on read.

A team in division D for season S is:

- `tentatively_eliminated` if they have at least one loss in a `pool` match AND no later round wins AND the division's solidification trigger hasn't fired.
- `permanently_eliminated` if they lost in a `playoff` match, OR they are tentatively_eliminated AND the trigger has fired, OR an admin manually eliminated them in Finals.
- `active` otherwise.

This avoids storing derived state but requires a helper query.

**Option B:** Add `division_team_state` table with `(season_id, team_id, division_id, state, updated_at)`. Simpler reads, more bookkeeping on writes.

Going with **A** for the first pass. We'll revisit if read complexity becomes painful.

For Finals manual eliminations specifically (rule 15), we need a stored override. Add a small table:

```ts
finals_eliminations: {
  id: integer PK,
  season_id: integer FK,
  team_id: integer FK,
  eliminated_at: text timestamp,
  unique (season_id, team_id)
}
```

This is the only stored elimination state. Everything else is derived.

## API

### Replaces / new

- `POST /api/seasons/[id]/teams` — body `{ teamId, divisionId }`. Adds a team to the season's pool of that division. Errors if team already in season.
- `DELETE /api/seasons/[id]/teams/[teamId]` — remove team from season (only if division bracket hasn't started). Cascades to season_teams row.
- `POST /api/seasons/[id]/matches` — body `{ divisionId | null, stage, round, homeTeamId | null, awayTeamId | null, scheduledAt, venue }`. Creates a new match in the specified column. `divisionId=null` is reserved for Finals.
- `PATCH /api/matches/[id]/teams` — body `{ homeTeamId?, awayTeamId? }`. Allows admin to fill or change the participants of a not-yet-final match. Enforces no-rematch and elimination rules.
- `POST /api/matches/[id]/promote` — body `{ teamId, toRound }`. Moves a winner from this match into a new or existing slot in the next round. The system creates the destination match if needed.
- `POST /api/finals/[seasonId]/eliminate` — body `{ teamId }`. Manual elimination override (rule 15). Inserts into `finals_eliminations`.

### Existing endpoints to update

- `POST /api/seasons` — drops the `teamIds` and `thirdPlaceMatch` parameters. New season starts empty; admin adds teams + divisions afterward via the new flow.
- `PATCH /api/seasons/[id]/seeds` — remove. Seeding is no longer a concept.
- `POST /api/seasons/[id]/start` — keep but with new semantics: starts the season once divisions and initial pool are set up. No bracket pre-generation.

### Lock-state helper

- `src/lib/division-lock.ts::isDivisionLocked(seasonId, divisionId)` — queries the earliest round-2 (`stage='playoff'`) match's `scheduled_at` and compares to `now()`. Used by API mutations and the canvas to allow/deny revivals.

## UI

### Canvas (admin only)

`/admin/seasons/[id]/canvas` — the new primary view for managing the bracket.

Layout:

- One section per division, plus a Finals section that appears once at least one division has a winner.
- Each section is a horizontal series of columns: `Pool`, `Round 2`, `Round 3`, …, `Final`.
- Each column shows its matches as cards stacked vertically. Each card has the two team slots, score (if any), status, scheduled time.
- A `+ Add match` button at the bottom of each column.

Interactions:

- Drag a team into a match slot to fill it. (`@dnd-kit` cross-container.)
- Click a match card to open a detail panel: edit schedule, edit score, mark `is_division_final` or `is_season_final`, manually eliminate (Finals only), delete.
- Add team to division: a sidebar lists all teams not yet in the season. Drag a team into a division's pool column to register them.
- Drag a winning team from match X to a match in a higher round to promote them.
- The canvas displays elimination state via card styling: tentative (faded with badge), permanent (struck through, hidden by default with a "Show eliminated" toggle).

Constraints enforced in the UI:

- Cannot drop the same two teams together if they've already played (no-rematch).
- Cannot drop a team into round 2+ of a division they aren't in.
- Cannot revive a tentatively-eliminated team if `isDivisionLocked` returns true.

### Public / non-admin views

- The standings page bracket display gets updated to render the new structure (multiple divisions, optional Finals). Read-only, non-clickable for non-admins.
- The schedule page admin bracket is replaced with a link to the new canvas.

## Migration Plan

The current seed (`Season 2025`, `Season 2026`) uses the old fixed-bracket model with `nextMatchId` chains. Cutting over:

1. Land schema changes (additive only; no destructive drops yet).
2. Update the seed script to use the new model. Rebuild Season 2025 (completed: pool → playoff → division finals → season final, all final) and Season 2026 (ongoing: pool with some matches final, others scheduled).
3. Old code paths that read `season_teams.seed`, `matches.bracket_position`, `matches.next_match_id` are left in place but become no-ops on new data.
4. After the new UI ships and is verified, drop the deprecated columns in a follow-up migration.

## Risks & Open Questions

- **Canvas complexity.** This is most of the work. Expect 2–3 weeks for a polished version. Risk: scope creep on drag interactions. Mitigation: ship a v1 with manual click-to-promote and add drag-drop in a follow-up if v1 feels clunky.
- **No-rematch enforcement.** Needs a helper `havePlayed(seasonId, a, b)` that queries the matches table. Cheap query; trivial to add.
- **Finals lock semantics.** Finals also has its own round-2 lock trigger. Confirmed: Finals follows the same rules as a division.
- **What happens to the `react-brackets` library?** Replaced by a custom canvas. Can be removed once no consumer remains.
- **Tests.** Bracket math tests in `tests/bracket.test.ts` will mostly become obsolete (no more `standardSeedOrder` etc.). Replace with tests for `havePlayed`, `isDivisionLocked`, and the elimination-state computer.

## Out of Scope

- Per-team stats (W/L records computed from match history would be a nice add but not required by the spec).
- Auto-suggested matchups based on remaining unplayed combinations.
- Bracket templates / "regenerate from these teams" — not needed since admin composes everything.
- Tiebreakers for circular results in the pool (since pool is admin-curated, this isn't a problem in practice).
