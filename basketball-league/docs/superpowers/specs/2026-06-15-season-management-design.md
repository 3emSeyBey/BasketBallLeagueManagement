# Season Management — Design

Date: 2026-06-15
Branch: master

## Goal

Give admins a real season lifecycle: create a new season (optionally importing a
past season's divisions/teams/rosters and their managers), activate it (which
ends the previous season), and browse ended seasons in a read-only archive.
Surface the active season + its start date on the dashboard.

## Decisions (from interview)

- **One active season at a time.** New seasons are created as `draft`; activating
  a draft auto-ends the currently active season.
- **Archive = live read-only view.** Ended seasons keep their existing rows
  (divisions, teams, rosters, brackets); standings recompute from that season's
  matches. Ended seasons are **locked** from edits so the archive stays stable.
  No snapshot tables.
- **Team names unique per division** (drop the global unique on `teams.name`,
  add unique `(division_id, name)`) so a past season's teams can be copied as-is.
- **Import copies divisions + teams + rosters**, nothing else (no brackets,
  matches, standings).
- **Imported teams carry their manager:** the user whose `teamId` points to the
  source team is reassigned to the new team. The archived team loses its manager
  pointer (it's historical/read-only).
- **Roster is per-team** in the import tree (each team has its own "include
  roster" checkbox).
- **Start date is set at activation**, not at creation.

## §1 Lifecycle & data model

States: `draft → active → ended` (one active at a time).
- Create (wizard) → `draft`, editable.
- Activate (`{ startedAt }`, default today or any date) → `active`; auto-ends the
  previously active season (`ended` + `endedAt`).
- End → `ended` + `endedAt`, read-only.

Schema:
- `teams.name`: drop global unique; add unique `(division_id, name)`.
- `seasons.endedAt` already exists; populate on end. `seasons.startedAt` stays
  NOT NULL — set to a placeholder (creation time) on create, overwritten on
  activation.
- No new tables.

Read-only lock: a helper `assertSeasonEditable(seasonId)` (throws / returns 409)
guards mutating routes when the parent season is `ended`:
divisions CRUD, teams create/update/image, players CRUD, bracket save/match-box,
match PATCH + match teams. Also update register / create-team dup-name checks to
be per-division rather than global.

## §2 Dashboard card + /admin/seasons + archive

Dashboard "Active Season" card (admin):
- Active season → value = name, subtitle "Started {date}", hint "Manage current
  season · View archive", links to `/admin/seasons`.
- No active season → value "None", subtitle "No active season", links to
  `/admin/seasons`.

`/admin/seasons` (redesigned):
- Top: **+ Add a new season** (opens wizard) and **View season archive** buttons.
  The old inline create form is removed.
- Below: active/draft seasons as manage cards (name, status, start date → manage
  link). Ended seasons are not listed here.

`/admin/seasons/archive`: list of ended seasons (name, started/ended dates) →
archive detail.

`/admin/seasons/archive/[id]` (read-only): divisions + teams + rosters,
per-season standings, read-only brackets (`BracketGrid`). All from live rows.

## §3 Creation wizard, import, activation

Create: `+ Add a new season` → if an active season exists, confirm "A season is
already underway. Create another?" → wizard at `/admin/seasons/new`.

Wizard:
1. Name the season.
2. Import (optional): pick a source past season → tree:
   - Division checkbox (toggles its teams),
   - Per-team checkbox,
   - Per-team "include roster" checkbox,
   - Select all at top. Skipping = empty season.
3. Create → `draft` season; copy selected divisions → teams (per-division unique
   names) → rosters; reassign each imported team's manager to the new team.

Manage page `/admin/seasons/[id]`:
- Draft: edit divisions/teams; **Activate** → date picker (default today or any) →
  sets `startedAt`, status `active`, ends the current active season (confirm
  "This ends {active season}.").
- Active: manage divisions + link to brackets; **End season** → confirm → `ended`.
- Ended: redirect to `/admin/seasons/archive/[id]`.

## §4 API surface

- `POST /api/seasons` — create `draft` (name); optional import payload
  `{ sourceSeasonId, teams: [{ teamId, includeRoster }] }` → copy divisions
  (derived from the teams' divisions) → teams → rosters; reassign managers.
- `GET /api/seasons/[id]/import-source` — divisions → teams (+ player counts,
  manager name) for the wizard tree.
- `POST /api/seasons/[id]/activate` — `{ startedAt }` → `active` + startedAt;
  auto-end the current active season. Replaces `/start`.
- `POST /api/seasons/[id]/end` — `ended` + `endedAt`.
- `GET /api/seasons`, `GET /api/seasons/[id]` — list/detail.
- Read-only guard `assertSeasonEditable` added to mutating routes.

## §5 Testing

- Unit: import-copy (divisions/teams/rosters, manager reassignment, per-division
  name handling), activation ends the prior active, end sets `endedAt`,
  read-only guard blocks edits on ended seasons.
- Per-season standings for the archive view.
- Integration: wizard create+import; activate → prior-season-ended transition.

## Out of scope / deferred

- Frozen snapshots (live read-only view chosen instead).
- Importing brackets/matches/standings.
- Manager re-assignment UI beyond the automatic import carry-over.
