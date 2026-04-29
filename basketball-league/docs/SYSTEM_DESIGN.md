# Basketball League Management — System Design

This document describes the structure and logic behind the league app: roles, bracketing, match-making, scheduling, and the supporting domain entities. It targets developers and admins who need to understand how the pieces fit together.

---

## 1. Roles & Authorization

The system models three principals:

| Principal | Storage | Authentication | Capabilities |
|---|---|---|---|
| **Admin** | `users.role = "admin"` | email or username + password (JWT cookie) | Full read/write across teams, players, users, seasons, brackets, schedule, announcements |
| **Team Manager** | `users.role = "team_manager"` with `users.team_id` linking the team they own | email or username + password | Edit their own team's roster + scheduled match streams; cannot delete teams or manage other teams |
| **Public Viewer** | No account | Anonymous | Read-only access to public team profiles, schedule, standings, announcements |

### 1.1 Authorization helpers (`src/lib/rbac.ts`)

- `requireRole(session, ...roles)` — throws `ForbiddenError` if the session is missing a required role. Used in API routes.
- `canManageTeam(session, teamId)` — returns true for admin (any team) or for a `team_manager` whose `session.teamId` matches.

### 1.2 Authentication

- Passwords are hashed with `bcryptjs` (`hashPassword`, `verifyPassword` in `src/lib/auth.ts`).
- Sessions are signed JWTs (`jose`, HS256) stored in an httpOnly cookie `league_session` for 7 days.
- Login (`POST /api/auth/login`) accepts an `identifier` (email or username) plus password. Back-compat: legacy `email` field still parsed.
- `getSession()` reads + verifies the cookie server-side.

### 1.3 User invariants

- Every team must have at least one team manager assigned. The team-creation API requires a `managerId` belonging to an unassigned `team_manager`.
- A team manager can only be assigned to one team (`users.team_id` is a single FK with `ON DELETE SET NULL` so deleting a team frees the manager up).
- Admins cannot be deleted. Team managers cannot be deleted while assigned to a team — admin must switch the team's manager first.
- Switching a team manager (`PATCH /api/teams/[id]/manager`) detaches the current manager(s) (sets their `team_id` to null) and assigns the new unassigned manager atomically.

---

## 2. Domain Entities

### 2.1 Teams (`teams`)

| Field | Notes |
|---|---|
| `id` | PK |
| `name` | Unique |
| `division` | Enum `A` \| `B` |
| `created_at` | Timestamp |

Teams cascade-delete their players. Their matches set the team-id columns to null (so a deleted team doesn't wipe historical matches).

### 2.2 Players (`players`)

| Field | Notes |
|---|---|
| `id` | PK |
| `team_id` | FK `teams.id` ON DELETE CASCADE |
| `name`, `jersey_number`, `position` | Required |
| `height`, `contact_number` | Optional metadata |
| `image_mime_type`, `image_data` | Optional photo blob (PNG/JPEG/WEBP/GIF, ≤5MB) |
| Unique constraint | `(team_id, jersey_number)` |

Each player has a dedicated detail page (`/players/[id]`). Team managers can edit their own roster; admins can edit any player. Photos are stored as DB blobs and served via `GET /api/players/[id]/image` with cache headers.

### 2.3 Users (`users`)

| Field | Notes |
|---|---|
| `id` | PK |
| `email` | Unique |
| `username` | Unique, optional, regex `[a-zA-Z0-9_.-]+` (3–40 chars) |
| `name` | Required (default `""` for backfilled rows) |
| `contact_number` | Optional |
| `password_hash` | bcrypt |
| `role` | Enum `admin` \| `team_manager` |
| `team_id` | Optional FK `teams.id` ON DELETE SET NULL |
| `created_at` | Timestamp |

Login accepts either `email` or `username`. The `team_id` is null for admins and for unassigned team managers waiting to be linked to a team.

### 2.4 Seasons (`seasons`)

| Field | Notes |
|---|---|
| `id` | PK |
| `name` | Unique |
| `started_at`, `ended_at` | ISO timestamps |
| `status` | `draft` \| `active` \| `ended` |
| `bracket_type` | Currently always `single_elim` |
| `third_place_match` | Boolean (currently informational; not yet emitted) |

Multiple seasons can co-exist in different statuses. The system treats *one* `active` season at a time as "the current bracket" for the standings/schedule pages.

### 2.5 Season Teams (`season_teams`)

The bracket roster lives in `season_teams`:

| Field | Notes |
|---|---|
| `season_id` | FK |
| `team_id` | FK |
| `seed` | 1-based position used to derive matchups |
| Unique constraints | `(season_id, team_id)` and `(season_id, seed)` |

Seed reorders during the draft phase (DnD UI) regenerate the round-1 home/away assignments without touching later rounds.

### 2.6 Matches (`matches`)

| Field | Notes |
|---|---|
| `id` | PK |
| `season_id` | FK |
| `home_team_id`, `away_team_id` | Nullable (TBD slots in later rounds) |
| `scheduled_at`, `venue` | Required |
| `status` | `scheduled` \| `live` \| `final` |
| `home_score`, `away_score` | Defaults 0 |
| `agora_channel` | Live-stream channel name |
| **Bracket columns** | |
| `round` | Bracket round (1 = first round). Null for non-bracket matches. |
| `bracket_position` | Slot within round (0-indexed). |
| `next_match_id` | Self-FK. Winner of this match advances into this row. |
| `next_match_slot` | Whether the winner becomes `home` or `away` of the next match. |

Non-bracket matches (e.g. round-robin) leave the bracket columns null and never appear in bracket views.

### 2.7 Announcements (`announcements`)

A rich-text feed with optional embedded images. Body is sanitized server-side via `sanitize-html` (allowlist-based). Images live in `announcement_images` as separate blob rows linked back via `<img src="/api/announcements/images/:id">`. The admin/manager UI uses Tiptap as the editor.

---

## 3. Bracket Design

### 3.1 Goals

- Single-elimination tournament.
- N teams, padded up to the next power of two with byes.
- Every match knows where its winner advances.
- Admin can review and reorder seeds before locking the bracket.
- Bracket display is read-only for everyone except an admin (who gets clickable matches that route to the schedule editor).

### 3.2 Pure logic (`src/lib/bracket.ts`)

#### `nextPowerOfTwo(n)`

Rounds up to the closest power of two: 1→1, 2→2, 3→4, 5→8, 8→8, 9→16. Tested.

#### `standardSeedOrder(size)`

Returns the slot order such that seed 1 is paired with the lowest-ranked seed, seed 2 with the second-lowest, etc., across the entire bracket so higher seeds avoid each other early. For size 4 → `[1, 4, 2, 3]`. For size 8 → `[1, 8, 4, 5, 2, 7, 3, 6]`.

The algorithm doubles a base list `[1, 2]` until it reaches the requested size; on each pass each existing seed is paired with `(2 * len + 1) - seed`. Throws if the requested size is not a power of two.

#### `buildSingleEliminationPlan(teamCount)`

Returns:

- `size` — total bracket slots (power of two)
- `rounds` — `log2(size)`
- `matches[]` — every match in the bracket with `{ round, position, homeSeed, awaySeed, nextPosition, nextSlot }`. Round-1 matches are populated with seed pairings; later rounds have null seeds because the participants are TBD until winners are decided. `nextPosition`/`nextSlot` are null for the final match.

This file is unit-tested (`tests/bracket.test.ts`) including the 4-team and 8-team cases plus a 3-team case that pads to 4.

### 3.3 Bracket creation flow

1. **Admin starts a new season** (`POST /api/seasons`). The body accepts `name`, `startedAt`, optional `teamIds` (defaults to all teams), and `thirdPlaceMatch`.
2. The selected teams are shuffled to pick an initial random seeding. Future implementations could seed by previous standings.
3. Insert the `seasons` row with `status='draft'`.
4. Insert `season_teams` rows mapping each `teamId` to a 1-based `seed`.
5. Call `buildSingleEliminationPlan(N)` to get the list of bracket matches.
6. Iterate the plan (round 1 first, then ascending rounds): create each match with `homeTeamId`/`awayTeamId` filled where the seeded participant is known. Track the inserted `id` keyed by `(round, position)` so subsequent rounds can be linked.
7. Second pass: for every plan match with a `nextPosition`, set `nextMatchId` on the source row to the corresponding next-round match.
8. Result: a fully wired bracket with `round=1` matches having teams and later rounds having null teams + a `nextMatchSlot` waiting for advancement.

### 3.4 Seed reordering (`PATCH /api/seasons/[id]/seeds`)

Admins drag teams in `SeedListEditor` (driven by `@dnd-kit/sortable`). On save:

- Validates the incoming `teamOrder` matches the existing season's team set exactly.
- Requires `season.status === 'draft'` (locked once active).
- A two-step update first moves seeds out of range to avoid violating the `(season_id, seed)` unique constraint, then re-applies the new seed numbers.
- Round-1 home/away assignments are recomputed using `buildSingleEliminationPlan` with the new order. Later rounds stay TBD.

### 3.5 Locking the bracket

`POST /api/seasons/[id]/start` flips `status` from `draft` to `active`. After locking:

- Seeding is no longer editable.
- Bracket appears on the standings page and on the schedule page (admin view).
- Match results begin to advance winners.

### 3.6 Match advancement

The match update endpoint (`PATCH /api/matches/[id]`) is the central hook for bracket progression. When a match transitions to `status='final'`:

1. `announceMatchResult(matchId)` writes a system announcement summarizing the result.
2. `advanceBracketWinner(matchId)` runs:
   - If `next_match_id` is null and the round is the highest round in the season, return `{ championTeamId, seasonId }`.
   - Otherwise, write the winner's `team_id` into the next match's `home_team_id` or `away_team_id` based on `next_match_slot`.
3. If a champion is returned, `announceChampion(seasonId, teamId)` publishes a champion announcement and the season is set to `status='ended'` with `endedAt = now()`.

Schedule changes (`scheduledAt` or `venue` updated) trigger `announceScheduleChange` with a diff of the old vs new values.

The same logic is exercised by the seed script when populating Season 2025 (fully completed) and Season 2026 (round 1 complete, final still scheduled).

### 3.7 Bracket display

`src/components/bracket/BracketView.tsx` consumes `BracketMatchView[]` from `loadBracket(seasonId)` and renders via `react-brackets`. It groups matches by round, sorts by `position`, builds a nicer round title (Round N → Quarterfinals → Semifinals → Final), and renders each match as a custom card showing both teams (or "TBD"), the date, and the status. When the `linkBase` prop is supplied, each card becomes a `next/link` to `${linkBase}/${matchId}` — used for the admin schedule page.

The standings page surfaces the bracket of the currently active season above the standings tables. Logged-in team managers also get their team's row highlighted in the standings tables.

---

## 4. Schedule & Match-Making

### 4.1 Match generation

Two paths exist:

- **Bracket creation** (described above) produces single-elimination matches scheduled at one-week intervals starting from `season.startedAt`. Venue defaults to "Bantayan Sports Complex" but can be edited per match.
- **Round-robin generator** (`POST /api/matches/generate` + `src/lib/matchmaking.ts::generateRoundRobin`) produces non-bracket matches for a chosen division. Each pairing happens twice (home/away) with a configurable `daysBetweenGames`. These matches don't carry bracket columns.

Both forms write into the same `matches` table; bracket consumers filter on `round IS NOT NULL`.

### 4.2 Schedule editing

Any admin can edit a match's `scheduled_at` and `venue` via the `ScheduleEditDialog` component on `/schedule/[id]`. The PATCH endpoint detects the diff and emits a "Schedule update" announcement, helping team managers and the public stay informed without manual broadcasts.

### 4.3 Score updates

Admins update scores + status using `ScoreForm` on the same match detail page. When status flips to `final`, the bracket advancement pipeline runs (see §3.6).

### 4.4 Live streaming hooks

Each match has an Agora RTC channel name. The match detail page picks the right component:

- Admins or any team manager whose team is involved → `StreamHost` (publisher).
- Everyone else → `StreamPlayer` (subscriber).

Token issuance lives at `GET /api/agora/token`, gated by `canManageTeam` for the home/away teams.

### 4.5 Public schedule

Public viewers see the same data via `/public/schedule` and `/public/schedule/[id]`. Edit controls and score entry are hidden — only timetable + venue + score + (subscriber-only) live stream show through.

---

## 5. Announcements

Announcements are first-class system events plus admin-authored content:

- **Authoring:** admins and team managers can create/edit/delete via `/announcements` (rich text editor with image upload to `announcement_images`). Edit/delete restricted to authors and admins.
- **System events:** `src/lib/announcement-events.ts` exposes helpers (`announceMatchResult`, `announceChampion`, `announceScheduleChange`, `advanceBracketWinner`) used by the match PATCH route. The `system author` is the first admin returned by `users.role='admin'`.
- **Surfaces:** the latest 3 announcements show on the login screen (public) and the in-app dashboard. Full feed lives at `/announcements` (in-app) and `/public/announcements` (public). Each announcement gets its own permalink.

Body sanitization (`src/lib/announcements.ts::sanitizeBody`) enforces a strict tag/attribute allowlist, rejects external image URLs, forces `target="_blank" rel="noopener noreferrer"` on links, and accepts only `<img>` tags whose `src` matches `^/api/announcements/images/\d+$`.

---

## 6. Operational Notes

- **Database:** SQLite over libSQL/Turso, with Drizzle ORM. Migrations live in `drizzle/` and are applied by `npm run db:migrate` (or via direct libsql client in non-default environments).
- **Seeding:** `npm run db:seed` populates two demo seasons (2025 ended, 2026 active), the four canonical teams (Sharks, Warriors, Eagles, Bulls), real NBA/PBA player rosters, the admin + per-team managers, and simulates bracket play including announcements. Re-running is idempotent.
- **Tests:** Vitest covers the bracket math, sanitizer, RBAC, and standings. `npm test`.
- **Build:** `npm run build` (Next.js 16, React 19) — required after schema changes.

---

## 7. Extension Points

- **Other bracket types.** The `bracket_type` column is extensible. Implementing double-elim or round-robin-into-knockout means a new plan generator and adjusting `BracketView` rendering.
- **Auto-seeding by standings.** Currently seeds are randomized at season creation. The hook would replace the shuffle in `POST /api/seasons` with a query against `computeStandings`.
- **Multiple active seasons.** Today the dashboard tile and standings page assume a single active season. Switching to "select active season" would require a UI selector and a per-season standings view.
- **Notifications.** System announcements are written to the same feed everyone reads. Pushing them to email or chat would plug into the same helpers.
