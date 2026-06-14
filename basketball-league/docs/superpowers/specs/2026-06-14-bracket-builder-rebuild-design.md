# Bracket Builder Rebuild — Design

Date: 2026-06-14
Branch: nbalike (new bracket work) — master holds pre-feat state

## Goal

Remove all existing bracketing/matching mechanics (round-robin, single-elim
auto-generation, NBA-style series/conferences, season simulation, elimination
state machine, seeding) and rebuild a manual, canvas-based **bracket builder**.

The admin draws single-elimination brackets per division on a canvas: rectangular
match boxes (two team slots each), connected by curly braces into the next round.
Each box is a real match. Winners auto-advance. Brackets publish to a read-only
public view.

Keep: per-season divisions (uncapped), the match scoring/scheduling/streaming
system, standings, players, seasons (draft/active/ended), auth.

## Core model decisions (from interview)

- **Box = real match row.** A bracket box creates/links a row in `matches`.
  Scoring happens in the existing match system; results flow into the bracket.
- **Auto-advance.** When a match ends, its winner is computed from the score and
  auto-fills the connected next-round box (home then away). Admin can override.
- **Team model simplified.** A team belongs to exactly one season-division.
  Creating a team picks its season+division. Drop global team divisions, the
  `teams.division` text tag, and the `seasonTeams` join table.
- **Default bracket per division.** One bracket per division may be `isDefault`.
  Creating a new team auto-places it into the default bracket's round 1.
- **Auto-placement scope:** round 1 only, fill home then away of the last
  incomplete round-1 match; if all full, create a new round-1 match (home = team,
  away awaiting). Later rounds are wired manually. Non-default brackets: manual only.
- **Pairing:** adjacent matches pair top-to-bottom in placement order
  (1+2 → next box, 3+4 → next box). A lone trailing match **waits** — its
  next-round box appears only once a second match joins it. No byes.
- **Publish = public-visibility toggle.** The bracket is a single always-live
  source of truth. Admin can edit structure anytime; the public read-only view
  reflects changes (and live scores/advancement) immediately. Only published
  brackets are public.
- **Multiple brackets per division = distinct stages/sub-tournaments**
  (e.g. main draw + consolation). All published ones are public, labeled by title.
  `isDefault` only governs auto-placement.
- **Re-selecting a placed team:** the add-team dropdown excludes teams currently
  in an *unfinished* match in this bracket. Once a team's latest match has `ended`
  it becomes re-selectable, so admin can drop a winner/loser into a new box.
  Prevents double-booking a team across concurrent live matches.

## §1 Teardown

**Schema deletions**
- Drop table `finalsEliminations`.
- `seasons`: drop `bracketType`, `thirdPlaceMatch`.
- Drop table `seasonTeams` (team→division becomes direct).
- Drop table `teamDivisions`; drop `teams.division` text field.
- `matches`: drop `round`, `stage`, `bracketPosition`, `isDivisionFinal`,
  `isSeasonFinal`, `nextMatchId`, `nextMatchSlot`.

**Logic deletions**
- `src/lib/bracket.ts`, `matchmaking.ts`, `elimination.ts`, `division-lock.ts`,
  `bracket-query.ts`, `season-bracket-query.ts`, `match-history.ts`
  (no-rematch rule removed).

**UI deletions**
- `components/canvas/*` (old SeasonCanvas, MatchPanel, AddMatchDialog,
  AddTeamDialog, BracketReadView, MatchCard).
- `components/bracket/*` (BracketView, BracketTree, SeedListEditor).
- `components/schedule/GenerateScheduleDialog`.
- Old route `app/(app)/admin/seasons/[id]/canvas`.

**API deletions**
- `/api/matches/generate`, `/api/matches/[id]/promote`,
  `/api/matches/[id]/division-final`, `/api/matches/[id]/season-final`,
  `/api/finals/[seasonId]/eliminate`, `/api/seasons/[id]/seeds`.

**Kept**
- `matches` core: score, status, scheduledAt, venue, Agora streaming,
  auto-announcements on match end.
- Standings (`standings.ts`, standings page/api).
- Players, per-season divisions (uncapped), seasons lifecycle, auth, teams,
  team managers.

## §2 New data model

```
seasons (kept, minus bracketType/thirdPlaceMatch)
  └─ divisions (kept; seasonId FK; no count cap)
       └─ teams (divisionId FK direct; global division tag dropped)
            └─ players (kept)

brackets (NEW)
  id, divisionId FK, title, isDefault bool, isPublished bool, createdAt
  - at most one isDefault=true per division (enforced in app logic)

bracket_matches (NEW)
  id, bracketId FK, matchId FK -> matches, roundIndex int, slotIndex int,
  feedsIntoId int nullable (self-FK to next-round bracket_match)
  - winner of this match auto-advances along feedsInto

matches (kept core; scheduledAt + venue relaxed to nullable for planned boxes)
```

## §3 UX

**Landing** `/admin/brackets` — grid of bracket cards (title, division, default
badge, published/draft); `+` tile opens the create wizard.

**Create wizard** (modal):
1. Select division (all season-divisions).
2. If the division already has bracket(s): choose **Create new** or
   **Edit existing** (pick which). Edit jumps to canvas.
3. Enter title.
4. Optional: mark as default for the division.
5. Canvas opens.

**Canvas** `/admin/brackets/[id]`:
- Rounds as left→right columns; match boxes stacked per round.
- Box = two horizontal slots. Empty slot = `+ add team` → modal dropdown of
  teams in this division, excluding teams currently in an unfinished match in
  this bracket (see re-selection rule).
- `+ add match` below the last box in a round.
- A round with 2+ matches auto-renders curly braces over adjacent pairs into a
  blank next-round box; a lone trailing match waits.
- Toolbar: edit title, Default toggle, Publish/Unpublish, delete.

**Public view** `/brackets` (and per-division surface): published brackets only,
read-only, labeled by title, live scores + advancement.

## §4 Core logic

**Auto-placement** (default bracket only, fires on team creation):
- Find last incomplete round-1 match → fill home, else away.
- If all round-1 matches full → create new round-1 match (home = team, away awaiting).

**Slot eligibility** (manual + auto): team must not already be in a non-ended
`bracket_match` in this bracket.

**Auto-advance** (on match score/end): compute winner → write into `feedsInto`
box's next open slot (home then away); admin may override. A next-round box
exists only once both feeder matches are present.

**Match creation from a box:** placing 2 teams creates a `matches` row in
`planned` status with nullable `scheduledAt`/`venue`; scheduled/scored later via
the existing match system.

**Publish:** toggle `isPublished`; structure stays editable; public view live.

## §5 API surface

- `GET/POST /api/brackets` — list / create (title, divisionId, isDefault).
- `GET/PATCH/DELETE /api/brackets/[id]` — load full tree / rename·default·publish / delete.
- `POST /api/brackets/[id]/matches` — add a match box to a round
  (creates planned match + bracket_match, recomputes pairing/feedsInto).
- `PATCH /api/brackets/[id]/matches/[bmId]` — set/clear a team slot.
- `DELETE /api/brackets/[id]/matches/[bmId]` — remove a box (re-pairs the round).
- Team-create endpoint extended to fire auto-placement.
- Existing match PATCH (score) extended to trigger auto-advance.

## §6 Testing

- Unit: auto-placement ordering (home/away/new-match), pairing + brace
  generation, lone-match-waits, auto-advance slot fill, one-default-per-division,
  team re-selectable only after prior match `ended`.
- Integration: wizard create/edit paths, publish visibility (public sees only
  published), team-create → auto-slot.
- Keep/adapt `tests/standings.test.ts`. Remove `tests/bracket.test.ts`,
  `tests/matchmaking.test.ts`.

## Out of scope / deferred

- Drag-and-drop reordering of boxes (click-driven for v1).
- Final look-and-feel polish (this spec fixes structure, not visual design).
- No-rematch enforcement (removed; revisit if needed).
