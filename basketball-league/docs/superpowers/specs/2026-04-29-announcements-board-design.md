# Announcements Board — Design

**Date:** 2026-04-29
**Status:** Approved (sections 1–5)

## Goal

Add an announcements feature to the basketball league app. Admins and team managers can post rich-text announcements with embedded images. Everyone (including unauthenticated visitors) can view them. Announcements appear on the login screen, the in-app dashboard, and dedicated public/in-app pages.

## Non-Goals

- Comments, reactions, or scheduled publishing.
- Announcement categories, tags, or pinning.
- Email/push notifications on new announcements.
- Orphaned image cleanup (uploads that never get linked to an announcement). Out of scope for v1.
- Pagination beyond a hard limit on list endpoints (latest N).
- Versioning / edit history.

## Roles & Permissions

| Action | admin | team_manager | viewer (anon or other) |
|---|---|---|---|
| View list | yes | yes | yes |
| View single | yes | yes | yes |
| Create | yes | yes | no |
| Edit | any | own only | no |
| Delete | any | own only | no |
| Upload image | yes | yes | no |

Role checks happen server-side on every mutation route via `requireRole` from `src/lib/rbac.ts`. Authorship checks compare `session.id` to `announcements.createdBy`.

## Schema

### Modify `announcements`

Existing columns: `id`, `body`, `createdBy`, `createdAt`. Add:

```ts
title: text("title").notNull(),                              // NEW
updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(), // NEW
```

`body` continues to store HTML — now sanitized rich-text from Tiptap.

### New table `announcement_images`

```ts
announcement_images: {
  id: integer pk autoIncrement,
  announcementId: integer FK announcements.id onDelete cascade, nullable,
  mimeType: text notNull,         // e.g. "image/png"
  data: blob notNull,
  createdBy: integer FK users.id notNull,
  createdAt: text default CURRENT_TIMESTAMP notNull,
}
```

Image referenced in body HTML as `<img src="/api/announcements/images/:id">`. On announcement create/edit, server scans the body for image IDs and updates `announcementId`. Cascade delete removes images when the announcement is deleted.

Migration generated via `drizzle-kit generate`.

## API

All routes live under `src/app/api/announcements/`.

```
GET    /api/announcements                 list, supports ?limit=N (default 20, max 50)
POST   /api/announcements                 create (admin|team_manager)
GET    /api/announcements/[id]            single
PATCH  /api/announcements/[id]            edit (author|admin)
DELETE /api/announcements/[id]            delete (author|admin)

POST   /api/announcements/images          multipart upload (admin|team_manager)
GET    /api/announcements/images/[id]     stream blob
```

### POST /api/announcements

Body: `{ title: string, body: string }`. Validation (zod):
- `title`: 1–200 chars
- `body`: 1–50000 chars after sanitize

Server steps:
1. `requireRole(session, "admin", "team_manager")`.
2. Sanitize body via `sanitizeBody` (sanitize-html config below).
3. Insert announcement.
4. `parseImageIds(body)` → `UPDATE announcement_images SET announcementId = :id WHERE id IN (...)` for IDs uploaded by this user with null `announcementId`.
5. Return `{ id }`.

### PATCH /api/announcements/[id]

Same validation. Authorization: `session.id === row.createdBy || session.role === "admin"`. Updates `title`, `body`, sets `updatedAt = CURRENT_TIMESTAMP`. Re-runs image linking for any newly inserted images.

### DELETE /api/announcements/[id]

Authorization same as PATCH. Cascade removes linked images via FK.

### POST /api/announcements/images

`multipart/form-data` with field `file`. Validation:
- Role: admin|team_manager.
- MIME allowlist: `image/png`, `image/jpeg`, `image/webp`, `image/gif`.
- Size: ≤5MB.

Stores blob with `announcementId = null`, `createdBy = session.id`. Returns `{ id, url: "/api/announcements/images/:id" }`.

### GET /api/announcements/images/[id]

Streams blob with:
- `Content-Type: <mimeType>`
- `Cache-Control: public, max-age=31536000, immutable`

### GET endpoints

No auth required. List endpoint returns sanitized body, ordered `createdAt DESC`. Includes `createdByName` joined from users (email prefix or full email — TBD: use email as display until a `name` column is added).

> Resolved: list returns `createdByEmail` (existing column) for now; no schema change to users.

## Sanitization

`src/lib/announcements.ts`:

```ts
export function sanitizeBody(html: string): string
```

Uses `sanitize-html` with config:
- Allowed tags: `p, br, strong, em, u, s, h1, h2, h3, ul, ol, li, blockquote, code, pre, a, img`
- Allowed attrs:
  - `a`: `href` (schemes: `http`, `https`, `mailto`), `target`, `rel`
  - `img`: `src`, `alt`
- Transforms:
  - `a` → force `rel="noopener noreferrer"`, `target="_blank"`
  - `img` → reject if `src` doesn't match `^/api/announcements/images/\d+$`
- Drops everything else (script, style, iframe, on*, data-* etc).

```ts
export function extractPreview(html: string, maxChars = 150): string
```

Strips tags, decodes entities, collapses whitespace, truncates to `maxChars` and appends `…`.

```ts
export function parseImageIds(html: string): number[]
```

Regex `/\/api\/announcements\/images\/(\d+)/g` extract IDs.

## Pages

All page files live under `src/app/`.

### In-app (logged in, `(app)` group)

- `/announcements` — full feed (paged later if needed). "New" button if `admin|team_manager`.
- `/announcements/new` — create form (server component shell + client `AnnouncementForm`).
- `/announcements/[id]` — single view. Edit/Delete buttons rendered if `session.id === row.createdBy || session.role === "admin"`.
- `/announcements/[id]/edit` — edit form.

### Public (`(public)` group)

- `/public/announcements` — feed list, no edit controls.
- `/public/announcements/[id]` — single view, no edit controls.

### Embedded surfaces

- **Login page** (`src/app/login/page.tsx`): below sign-in card, render latest 3 via server-side fetch from DB (turn login into a server component that wraps the existing client form, or expose a server child). Card shows title + ~150 char preview. "Read more" → `/public/announcements/[id]`.
- **Dashboard** (`src/app/(app)/dashboard/page.tsx`): new "Latest Announcements" Card with latest 3 (title + preview + "Read more" → `/announcements/[id]`). "View all" link → `/announcements`.

### Nav

Per user preference, **no AppNav or PublicNav links** are added. Discovery happens via dashboard card, login feed, and direct URLs.

## Components

```
src/components/announcements/
  RichTextEditor.tsx              client
  AnnouncementForm.tsx            client
  AnnouncementCard.tsx            server-safe
  AnnouncementBody.tsx            server-safe
  DeleteAnnouncementButton.tsx    client
```

### RichTextEditor

Tiptap with:
- `@tiptap/react`
- `@tiptap/starter-kit`
- `@tiptap/extension-image`
- `@tiptap/extension-link`

Toolbar buttons: bold, italic, underline, h1/h2/h3, bullet list, ordered list, link, image. Image button opens file picker, POSTs to `/api/announcements/images`, inserts `<img src=URL>` on success. Shows inline error toast on failure.

### AnnouncementForm

Title input + RichTextEditor + Submit. Used by new and edit pages. Calls POST/PATCH, redirects to `/announcements/[id]`.

### AnnouncementCard

Props: `{ announcement, variant: "compact" | "full", linkBase: "/announcements" | "/public/announcements" }`. Compact shows title + preview + meta + "Read more". Full shows title + meta + sanitized body via `AnnouncementBody`.

### AnnouncementBody

Renders sanitized HTML via `dangerouslySetInnerHTML` inside a `prose` Tailwind container. Body comes pre-sanitized from server, but component is the only place with `dangerouslySetInnerHTML` so audits stay localized.

### DeleteAnnouncementButton

Confirm dialog (existing `Dialog` component) → DELETE → redirect to `/announcements`.

## Dependencies to add

- `@tiptap/react`
- `@tiptap/starter-kit`
- `@tiptap/extension-image`
- `@tiptap/extension-link`
- `sanitize-html`
- `@types/sanitize-html` (dev)

## Testing

Vitest specs under `tests/`:

- `tests/lib/announcements.test.ts`
  - `sanitizeBody` strips `<script>`, `onerror=`, disallowed tags
  - `sanitizeBody` preserves allowed tags + image src matching pattern
  - `sanitizeBody` rejects external image src
  - `extractPreview` strips tags, truncates, appends ellipsis
  - `parseImageIds` extracts IDs from body
- `tests/api/announcements.test.ts`
  - POST denies anon and viewer roles
  - POST allows admin and team_manager
  - PATCH/DELETE deny non-author non-admin
  - PATCH/DELETE allow author
  - PATCH/DELETE allow admin override
- `tests/api/announcement-images.test.ts`
  - POST rejects oversized, wrong mime, anon
  - GET streams blob with cache headers

## Risks / Open Items

- **Login server-component conversion:** existing `src/app/login/page.tsx` is `"use client"`. To embed server-rendered announcement cards we extract the form into a child client component (`LoginForm.tsx`) and convert the page to async server. Low risk, mechanical change.
- **Tiptap SSR:** Tiptap requires `immediatelyRender: false` in Next.js to avoid hydration mismatch. Set on `useEditor`.
- **Body size:** sanitized HTML up to 50000 chars. With separate-table image storage (no base64 in body) this is comfortable.
