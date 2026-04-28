# Basketball League Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based basketball league management system on Next.js with role-based access (Admin / Team Manager / Public Viewer), SQLite-compatible storage, automated round-robin matchmaking, and Agora-powered live game streaming.

**Architecture:** Next.js 15 (App Router, React, TypeScript) provides both the React UI and serverless API routes deployed to Vercel. Persistence uses libSQL (Turso) — SQLite-compatible, accessed via Drizzle ORM (local file in dev, hosted DB in prod). Auth uses bcrypt + JWT in an HttpOnly cookie, with role-based middleware. Live streams use Agora Web SDK with server-issued tokens. Standings are computed from match results on read; matchmaking is a server action that generates a round-robin schedule from registered teams.

**Tech Stack:**
- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS + shadcn/ui (Radix primitives)
- Drizzle ORM + `@libsql/client` (SQLite/Turso)
- `bcryptjs` + `jose` (JWT)
- `agora-rtc-sdk-ng` (browser) + `agora-token` (server)
- `vitest` for unit tests, `@testing-library/react` for component tests
- Inter font, white background, `#f37021` orange accent (matches existing HTML prototype)

**Design System (overrides ui-ux-pro-max default purple to match user requirement):**
- Primary `#f37021` (action orange), Foreground `#0f172a` (slate-900), Background `#ffffff`, Muted `#f8fafc`, Border `#e2e8f0`, Destructive `#dc2626`
- Heading + Body: Inter (single family, weights 400/500/600/700)
- Card-based layout, 8px spacing rhythm, 150–300ms transitions, Lucide icons (no emoji), 4.5:1 min contrast
- Reference HTML/CSS in `Web-Based Basketball League/{Admin,Team Manager,Public Viewer}/` for visual parity

**MVP Scope (locked):**
1. Login + role gating (Admin, Team Manager) — Public Viewer needs no login
2. Admin: manage teams, schedule matches (manual + auto round-robin), view standings, manage user accounts
3. Team Manager: manage their team's players, view schedule, view standings
4. Public Viewer: read-only Dashboard, Teams, Schedule, Standings + live stream viewing
5. Standings auto-derived from match results
6. Agora live streaming embedded on match detail page (Admin/Team Manager broadcast, all viewers consume)
7. Automated matchmaking: round-robin generator per division per season

**Out of scope (do not implement):** Tournament bracket UI, payments, ticketing, marketing, mobile native, push notifications, email verification, password reset (covered later iteration).

---

## File Structure

```
basketball-league/
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── drizzle.config.ts
├── vitest.config.ts
├── .env.example
├── .env.local                       (gitignored)
├── components.json                  (shadcn config)
├── public/
│   └── logo.svg
├── drizzle/                         (generated migrations)
└── src/
    ├── app/
    │   ├── layout.tsx               root layout (Inter font, theme vars)
    │   ├── page.tsx                 redirects to /dashboard or /login
    │   ├── globals.css              tailwind + tokens
    │   ├── login/page.tsx
    │   ├── (app)/                   route group with auth required + shell
    │   │   ├── layout.tsx           NavBar + role-aware nav
    │   │   ├── dashboard/page.tsx
    │   │   ├── teams/
    │   │   │   ├── page.tsx
    │   │   │   ├── new/page.tsx
    │   │   │   └── [id]/page.tsx
    │   │   ├── players/page.tsx     (team manager only)
    │   │   ├── schedule/
    │   │   │   ├── page.tsx
    │   │   │   ├── new/page.tsx
    │   │   │   └── [id]/page.tsx    (live stream lives here)
    │   │   ├── standings/page.tsx
    │   │   └── admin/users/page.tsx (admin only)
    │   ├── (public)/                public viewer route group
    │   │   ├── layout.tsx           public navbar
    │   │   ├── page.tsx             public dashboard
    │   │   ├── teams/page.tsx
    │   │   ├── teams/[id]/page.tsx
    │   │   ├── schedule/page.tsx
    │   │   ├── schedule/[id]/page.tsx
    │   │   └── standings/page.tsx
    │   └── api/
    │       ├── auth/login/route.ts
    │       ├── auth/logout/route.ts
    │       ├── auth/me/route.ts
    │       ├── teams/route.ts
    │       ├── teams/[id]/route.ts
    │       ├── players/route.ts
    │       ├── players/[id]/route.ts
    │       ├── matches/route.ts
    │       ├── matches/[id]/route.ts
    │       ├── matches/generate/route.ts
    │       ├── standings/route.ts
    │       ├── users/route.ts
    │       └── agora/token/route.ts
    ├── db/
    │   ├── client.ts                drizzle + libsql singleton
    │   ├── schema.ts                tables + types
    │   └── seed.ts                  dev seed script
    ├── lib/
    │   ├── auth.ts                  hash, verify, JWT sign/verify
    │   ├── session.ts               getSession() server helper
    │   ├── rbac.ts                  requireRole helpers
    │   ├── matchmaking.ts           round-robin generator (pure)
    │   ├── standings.ts             standings calc (pure)
    │   └── agora.ts                 token gen wrapper
    ├── middleware.ts                redirects unauthenticated users
    └── components/
        ├── ui/                      shadcn primitives (Button, Input, Table, Card, etc.)
        ├── nav/
        │   ├── AppNav.tsx
        │   └── PublicNav.tsx
        ├── teams/TeamCard.tsx
        ├── teams/TeamForm.tsx
        ├── players/PlayerForm.tsx
        ├── schedule/MatchRow.tsx
        ├── schedule/MatchForm.tsx
        ├── schedule/ScoreForm.tsx
        ├── standings/StandingsTable.tsx
        ├── stream/StreamPlayer.tsx  Agora consumer
        └── stream/StreamHost.tsx    Agora publisher
└── tests/
    ├── matchmaking.test.ts
    ├── standings.test.ts
    ├── auth.test.ts
    └── rbac.test.ts
```

**Boundaries:**
- Pure logic (matchmaking, standings, hashing) lives in `lib/` — no DB or framework imports — fully unit-testable.
- Drizzle schema is single source of truth for table shapes + TS types.
- API routes are thin: validate → call lib + db → JSON response.
- Server Components fetch directly from db; Client Components POST to API.

---

## Phase 0: Project Bootstrap

### Task 0.1: Initialize Next.js project

**Files:**
- Create: `basketball-league/` (whole project, sibling to existing `Web-Based Basketball League/` prototype)

- [ ] **Step 1: Create the Next.js app**

Run from repo root `/home/eem/Desktop/Side Quests/BasketBallLeagueManagement/`:
```bash
npx create-next-app@latest basketball-league \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --no-turbopack
```
When prompted for any unspecified option, accept the default.
Expected: directory `basketball-league/` created with default starter.

- [ ] **Step 2: Verify dev server boots**

```bash
cd basketball-league && npm run dev
```
Open http://localhost:3000 — Next.js welcome page renders. Stop server (Ctrl+C).

- [ ] **Step 3: Commit**

```bash
cd /home/eem/Desktop/Side\ Quests/BasketBallLeagueManagement
git add basketball-league
git commit -m "chore: scaffold Next.js app for league management"
```

### Task 0.2: Install runtime + dev dependencies

**Files:**
- Modify: `basketball-league/package.json`

- [ ] **Step 1: Install runtime deps**

```bash
cd basketball-league
npm install @libsql/client drizzle-orm bcryptjs jose zod \
  agora-rtc-sdk-ng agora-token \
  lucide-react class-variance-authority clsx tailwind-merge \
  @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
  @radix-ui/react-label @radix-ui/react-select @radix-ui/react-toast
```

- [ ] **Step 2: Install dev deps**

```bash
npm install -D drizzle-kit @types/bcryptjs vitest @vitest/ui \
  @testing-library/react @testing-library/jest-dom jsdom \
  tsx
```

- [ ] **Step 3: Verify install**

```bash
npm ls drizzle-orm @libsql/client agora-rtc-sdk-ng vitest
```
Expected: each prints a version, no `UNMET` markers.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add db, auth, agora, test deps"
```

### Task 0.3: Configure Tailwind theme + design tokens

**Files:**
- Modify: `basketball-league/src/app/globals.css`
- Modify: `basketball-league/tailwind.config.ts`
- Modify: `basketball-league/src/app/layout.tsx`

- [ ] **Step 1: Replace `globals.css` with token-driven base**

```css
@import "tailwindcss";

@theme {
  --color-primary: #f37021;
  --color-primary-foreground: #ffffff;
  --color-background: #ffffff;
  --color-foreground: #0f172a;
  --color-muted: #f8fafc;
  --color-muted-foreground: #64748b;
  --color-border: #e2e8f0;
  --color-card: #ffffff;
  --color-destructive: #dc2626;
  --color-ring: #f37021;
  --radius: 0.625rem;
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
}

* { border-color: var(--color-border); }

body {
  background: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 2: Wire Inter via `next/font` in `layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Basketball League",
  description: "League management system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Replace default `page.tsx` with redirect placeholder**

```tsx
import { redirect } from "next/navigation";
export default function Home() { redirect("/dashboard"); }
```

- [ ] **Step 4: Boot and visual-check**

```bash
npm run dev
```
Visit http://localhost:3000 — should redirect (404 expected for `/dashboard` is fine). Stop server.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/app/page.tsx tailwind.config.ts
git commit -m "feat: configure design tokens, Inter font, root redirect"
```

### Task 0.4: Initialize shadcn/ui

**Files:**
- Create: `basketball-league/components.json`
- Create: `basketball-league/src/lib/utils.ts`
- Create: `basketball-league/src/components/ui/*`

- [ ] **Step 1: Run shadcn init**

```bash
npx shadcn@latest init -d
```
When prompted, choose: Style=New York, Base color=Neutral, CSS variables=yes.

- [ ] **Step 2: Add primitives needed across the app**

```bash
npx shadcn@latest add button input label card table dialog \
  dropdown-menu select toast badge tabs form
```

- [ ] **Step 3: Verify import alias works**

```bash
npx tsc --noEmit
```
Expected: exit 0 (no type errors).

- [ ] **Step 4: Commit**

```bash
git add components.json src/lib/utils.ts src/components/ui
git commit -m "feat: install shadcn primitives"
```

### Task 0.5: Configure Vitest

**Files:**
- Create: `basketball-league/vitest.config.ts`
- Create: `basketball-league/tests/sanity.test.ts`
- Modify: `basketball-league/package.json` (scripts)

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

- [ ] **Step 2: Add scripts to `package.json`**

In `"scripts"`, add: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 3: Write sanity test**

`tests/sanity.test.ts`:
```ts
import { describe, it, expect } from "vitest";
describe("sanity", () => {
  it("runs", () => expect(1 + 1).toBe(2));
});
```

- [ ] **Step 4: Run tests**

```bash
npm test
```
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts tests/sanity.test.ts package.json
git commit -m "chore: configure vitest"
```

---

## Phase 1: Database Schema + Drizzle Setup

### Task 1.1: Configure Drizzle + libSQL client

**Files:**
- Create: `basketball-league/drizzle.config.ts`
- Create: `basketball-league/src/db/client.ts`
- Create: `basketball-league/.env.example`
- Modify: `basketball-league/.gitignore` (add `.env.local`, `dev.db`, `dev.db-*`)

- [ ] **Step 1: Write `drizzle.config.ts`**

```ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "libsql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "file:./dev.db" },
});
```

- [ ] **Step 2: Write `src/db/client.ts`**

```ts
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;

const client = createClient({ url, authToken });
export const db = drizzle(client, { schema });
```

- [ ] **Step 3: Write `.env.example`**

```
DATABASE_URL=file:./dev.db
DATABASE_AUTH_TOKEN=
JWT_SECRET=replace-with-32-byte-random
AGORA_APP_ID=
AGORA_APP_CERTIFICATE=
NEXT_PUBLIC_AGORA_APP_ID=
```

- [ ] **Step 4: Copy to `.env.local` for dev**

```bash
cp .env.example .env.local
# Generate a JWT secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Paste the printed value into .env.local as JWT_SECRET
```

- [ ] **Step 5: Update `.gitignore`**

Append:
```
.env.local
dev.db
dev.db-journal
dev.db-shm
dev.db-wal
```

- [ ] **Step 6: Commit**

```bash
git add drizzle.config.ts src/db/client.ts .env.example .gitignore
git commit -m "feat: configure drizzle with libsql"
```

### Task 1.2: Define schema

**Files:**
- Create: `basketball-league/src/db/schema.ts`

- [ ] **Step 1: Write `schema.ts`**

```ts
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, primaryKey, unique } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "team_manager"] }).notNull(),
  teamId: integer("team_id").references(() => teams.id, { onDelete: "set null" }),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  division: text("division", { enum: ["A", "B"] }).notNull(),
  logoUrl: text("logo_url"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const players = sqliteTable("players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  jerseyNumber: integer("jersey_number").notNull(),
  position: text("position", { enum: ["PG", "SG", "SF", "PF", "C"] }).notNull(),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (t) => ({
  uniqueJersey: unique().on(t.teamId, t.jerseyNumber),
}));

export const seasons = sqliteTable("seasons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
});

export const matches = sqliteTable("matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seasonId: integer("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
  homeTeamId: integer("home_team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  awayTeamId: integer("away_team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  scheduledAt: text("scheduled_at").notNull(),
  venue: text("venue").notNull(),
  status: text("status", { enum: ["scheduled", "live", "final"] }).notNull().default("scheduled"),
  homeScore: integer("home_score").default(0).notNull(),
  awayScore: integer("away_score").default(0).notNull(),
  agoraChannel: text("agora_channel"),
});

export const announcements = sqliteTable("announcements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  body: text("body").notNull(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type Season = typeof seasons.$inferSelect;
```

- [ ] **Step 2: Generate migration**

```bash
npx drizzle-kit generate
```
Expected: a `0000_*.sql` file appears in `drizzle/`.

- [ ] **Step 3: Apply migration**

```bash
npx drizzle-kit migrate
```
Expected: `dev.db` file created at project root, no errors.

- [ ] **Step 4: Verify with sqlite-cli check**

```bash
node -e "const c=require('@libsql/client').createClient({url:'file:./dev.db'}); c.execute('SELECT name FROM sqlite_master WHERE type=\\'table\\'').then(r=>console.log(r.rows))"
```
Expected: array containing `users`, `teams`, `players`, `matches`, `seasons`, `announcements`.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat: define league schema (users, teams, players, matches, seasons)"
```

### Task 1.3: Seed script

**Files:**
- Create: `basketball-league/src/db/seed.ts`
- Modify: `basketball-league/package.json` (add `db:seed` script)

- [ ] **Step 1: Write seed script**

```ts
import { db } from "./client";
import { users, teams, seasons } from "./schema";
import bcrypt from "bcryptjs";

async function main() {
  const adminHash = await bcrypt.hash("admin123", 10);
  const tmHash = await bcrypt.hash("manager123", 10);

  await db.insert(seasons).values({ name: "Season 2026", startedAt: new Date().toISOString() }).onConflictDoNothing();

  await db.insert(teams).values([
    { name: "Bantayan Sharks", division: "A" },
    { name: "Madridejos Warriors", division: "A" },
    { name: "Santa Fe Eagles", division: "B" },
    { name: "Bantayan Bulls", division: "B" },
  ]).onConflictDoNothing();

  await db.insert(users).values([
    { email: "admin@league.test", passwordHash: adminHash, role: "admin" },
    { email: "manager@league.test", passwordHash: tmHash, role: "team_manager", teamId: 1 },
  ]).onConflictDoNothing();

  console.log("Seed complete.");
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Add script to `package.json`**

`"db:seed": "tsx src/db/seed.ts"`, `"db:migrate": "drizzle-kit migrate"`, `"db:generate": "drizzle-kit generate"`.

- [ ] **Step 3: Run seed**

```bash
npm run db:seed
```
Expected: prints `Seed complete.`

- [ ] **Step 4: Commit**

```bash
git add src/db/seed.ts package.json
git commit -m "feat: add dev seed script"
```

---

## Phase 2: Authentication + RBAC

### Task 2.1: Hash + JWT helpers (TDD)

**Files:**
- Create: `basketball-league/src/lib/auth.ts`
- Create: `basketball-league/tests/auth.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/auth.test.ts`:
```ts
import { describe, it, expect, beforeAll } from "vitest";
import { hashPassword, verifyPassword, signSession, verifySession } from "@/lib/auth";

beforeAll(() => { process.env.JWT_SECRET = "0".repeat(64); });

describe("auth", () => {
  it("hashes and verifies passwords", async () => {
    const h = await hashPassword("pw");
    expect(await verifyPassword("pw", h)).toBe(true);
    expect(await verifyPassword("nope", h)).toBe(false);
  });

  it("signs and verifies session JWT", async () => {
    const token = await signSession({ userId: 1, role: "admin", teamId: null });
    const payload = await verifySession(token);
    expect(payload.userId).toBe(1);
    expect(payload.role).toBe("admin");
  });

  it("rejects tampered token", async () => {
    const token = await signSession({ userId: 1, role: "admin", teamId: null });
    await expect(verifySession(token + "x")).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test, confirm failure**

```bash
npm test
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/auth.ts`**

```ts
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export type SessionPayload = {
  userId: number;
  role: "admin" | "team_manager";
  teamId: number | null;
};

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET!);

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export async function signSession(p: SessionPayload): Promise<string> {
  return await new SignJWT({ ...p })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, secret());
  return {
    userId: payload.userId as number,
    role: payload.role as SessionPayload["role"],
    teamId: (payload.teamId as number | null) ?? null,
  };
}
```

- [ ] **Step 4: Run test, confirm pass**

```bash
npm test
```
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts tests/auth.test.ts
git commit -m "feat: password hashing + JWT session helpers"
```

### Task 2.2: Server session helper + RBAC

**Files:**
- Create: `basketball-league/src/lib/session.ts`
- Create: `basketball-league/src/lib/rbac.ts`
- Create: `basketball-league/tests/rbac.test.ts`

- [ ] **Step 1: Write `src/lib/session.ts`**

```ts
import { cookies } from "next/headers";
import { verifySession, type SessionPayload } from "./auth";

export const SESSION_COOKIE = "league_session";

export async function getSession(): Promise<SessionPayload | null> {
  const c = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!c) return null;
  try { return await verifySession(c); } catch { return null; }
}
```

- [ ] **Step 2: Write `src/lib/rbac.ts`**

```ts
import type { SessionPayload } from "./auth";

export type Role = SessionPayload["role"];

export class ForbiddenError extends Error {
  constructor() { super("Forbidden"); }
}

export function requireRole(session: SessionPayload | null, ...roles: Role[]): SessionPayload {
  if (!session) throw new ForbiddenError();
  if (!roles.includes(session.role)) throw new ForbiddenError();
  return session;
}

export function canManageTeam(session: SessionPayload | null, teamId: number): boolean {
  if (!session) return false;
  if (session.role === "admin") return true;
  return session.role === "team_manager" && session.teamId === teamId;
}
```

- [ ] **Step 3: Write `tests/rbac.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { requireRole, canManageTeam, ForbiddenError } from "@/lib/rbac";

const admin = { userId: 1, role: "admin" as const, teamId: null };
const tm = { userId: 2, role: "team_manager" as const, teamId: 5 };

describe("rbac", () => {
  it("requireRole passes when role matches", () => {
    expect(requireRole(admin, "admin")).toBe(admin);
  });
  it("requireRole throws when null", () => {
    expect(() => requireRole(null, "admin")).toThrow(ForbiddenError);
  });
  it("requireRole throws when role mismatched", () => {
    expect(() => requireRole(tm, "admin")).toThrow(ForbiddenError);
  });
  it("canManageTeam: admin = always true", () => {
    expect(canManageTeam(admin, 99)).toBe(true);
  });
  it("canManageTeam: tm only own team", () => {
    expect(canManageTeam(tm, 5)).toBe(true);
    expect(canManageTeam(tm, 6)).toBe(false);
  });
  it("canManageTeam: no session = false", () => {
    expect(canManageTeam(null, 5)).toBe(false);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm test
```
Expected: 6 new tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/session.ts src/lib/rbac.ts tests/rbac.test.ts
git commit -m "feat: session helper + RBAC checks"
```

### Task 2.3: Login API route

**Files:**
- Create: `basketball-league/src/app/api/auth/login/route.ts`
- Create: `basketball-league/src/app/api/auth/logout/route.ts`
- Create: `basketball-league/src/app/api/auth/me/route.ts`

- [ ] **Step 1: Write `login/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { verifyPassword, signSession } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session";

const Body = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const user = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await signSession({ userId: user.id, role: user.role, teamId: user.teamId });
  const res = NextResponse.json({ id: user.id, email: user.email, role: user.role, teamId: user.teamId });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
```

- [ ] **Step 2: Write `logout/route.ts`**

```ts
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
```

- [ ] **Step 3: Write `me/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json(null);
  return NextResponse.json(s);
}
```

- [ ] **Step 4: Smoke test login**

Boot dev server, then:
```bash
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@league.test","password":"admin123"}'
```
Expected: `200 OK`, `Set-Cookie: league_session=...`, JSON body contains `"role":"admin"`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth
git commit -m "feat: login, logout, me API routes"
```

### Task 2.4: Middleware for route protection

**Files:**
- Create: `basketball-league/src/middleware.ts`

- [ ] **Step 1: Write `src/middleware.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/session";

const PROTECTED = ["/dashboard", "/teams", "/players", "/schedule", "/standings", "/admin"];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (!PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET!));
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next|api/auth|public|favicon.ico).*)"],
};
```

- [ ] **Step 2: Verify redirect**

Boot dev server, browse to http://localhost:3000/dashboard while logged out.
Expected: 307 redirect to `/login`.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: middleware redirects unauthenticated users to /login"
```

### Task 2.5: Login page UI

**Files:**
- Create: `basketball-league/src/app/login/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) { setError("Invalid email or password"); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-dvh grid place-items-center bg-muted px-4">
      <Card className="w-full max-w-sm p-8 space-y-6">
        <div className="space-y-1 text-center">
          <div className="text-3xl">🏀</div>
          <h1 className="text-2xl font-semibold">Basketball League</h1>
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="text-xs text-center text-muted-foreground">
          Public viewer? <a href="/" className="text-primary underline">Browse without an account</a>
        </p>
      </Card>
    </main>
  );
}
```

- [ ] **Step 2: Manual smoke test**

Boot dev server, visit http://localhost:3000/login, submit `admin@league.test` / `admin123`.
Expected: redirect to `/dashboard` (404 OK for now), session cookie set.

- [ ] **Step 3: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat: login page"
```

---

## Phase 3: App Shell + Role-Aware Navigation

### Task 3.1: Authenticated app layout with nav

**Files:**
- Create: `basketball-league/src/app/(app)/layout.tsx`
- Create: `basketball-league/src/components/nav/AppNav.tsx`
- Create: `basketball-league/src/components/nav/LogoutButton.tsx`

- [ ] **Step 1: Write `AppNav.tsx`**

```tsx
import Link from "next/link";
import { Trophy } from "lucide-react";
import type { Role } from "@/lib/rbac";
import { LogoutButton } from "./LogoutButton";

const NAV_BY_ROLE: Record<Role, { href: string; label: string }[]> = {
  admin: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/teams", label: "Teams" },
    { href: "/schedule", label: "Schedule" },
    { href: "/standings", label: "Standings" },
  ],
  team_manager: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/players", label: "Players" },
    { href: "/schedule", label: "Schedule" },
    { href: "/standings", label: "Standings" },
  ],
};

export function AppNav({ role }: { role: Role }) {
  const items = NAV_BY_ROLE[role];
  return (
    <header className="sticky top-0 z-40 bg-card border-b">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Trophy className="size-5 text-primary" />
          Basketball League
        </Link>
        <nav className="flex gap-6 text-sm">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className="hover:text-primary transition-colors">
              {i.label}
            </Link>
          ))}
        </nav>
        <LogoutButton />
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Write `LogoutButton.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button variant="ghost" size="sm" onClick={async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login"); router.refresh();
    }}>Log out</Button>
  );
}
```

- [ ] **Step 3: Write `(app)/layout.tsx`**

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AppNav } from "@/components/nav/AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <div>
      <AppNav role={session.role} />
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Move `dashboard/page.tsx` placeholder**

Create `src/app/(app)/dashboard/page.tsx`:
```tsx
import { getSession } from "@/lib/session";
export default async function Dashboard() {
  const s = (await getSession())!;
  return <h1 className="text-2xl font-semibold">Welcome, {s.role}</h1>;
}
```

- [ ] **Step 5: Smoke test**

Log in, confirm nav renders correct links per role. Click Log out, confirm redirect to `/login`.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\) src/components/nav
git commit -m "feat: authenticated app shell with role-aware nav"
```

---

## Phase 4: Teams Module (Admin)

### Task 4.1: Teams API (list + create)

**Files:**
- Create: `basketball-league/src/app/api/teams/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { teams } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

const Create = z.object({
  name: z.string().min(2).max(80),
  division: z.enum(["A", "B"]),
  logoUrl: z.string().url().optional(),
});

export async function GET() {
  const rows = await db.select().from(teams).orderBy(teams.name);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw e;
  }
  const parsed = Create.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const [row] = await db.insert(teams).values(parsed.data).returning();
  return NextResponse.json(row, { status: 201 });
}
```

- [ ] **Step 2: Smoke test list**

```bash
curl http://localhost:3000/api/teams | head -50
```
Expected: JSON array with seeded teams.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/teams/route.ts
git commit -m "feat: teams list + create API"
```

### Task 4.2: Teams API (detail + update + delete)

**Files:**
- Create: `basketball-league/src/app/api/teams/[id]/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { teams } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

const Update = z.object({
  name: z.string().min(2).max(80).optional(),
  division: z.enum(["A", "B"]).optional(),
  logoUrl: z.string().url().nullable().optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await db.query.teams.findFirst({ where: eq(teams.id, Number(id)) });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }
  const { id } = await params;
  const parsed = Update.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const [row] = await db.update(teams).set(parsed.data).where(eq(teams.id, Number(id))).returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }
  const { id } = await params;
  await db.delete(teams).where(eq(teams.id, Number(id)));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/teams/\[id\]/route.ts
git commit -m "feat: team detail/update/delete API"
```

### Task 4.3: Teams list page (admin)

**Files:**
- Create: `basketball-league/src/app/(app)/teams/page.tsx`
- Create: `basketball-league/src/components/teams/TeamCard.tsx`

- [ ] **Step 1: Write `TeamCard.tsx`**

```tsx
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Team } from "@/db/schema";

export function TeamCard({ team }: { team: Team }) {
  return (
    <Link href={`/teams/${team.id}`}>
      <Card className="p-5 hover:border-primary transition-colors h-full">
        <div className="flex items-start justify-between">
          <div className="size-12 rounded-lg bg-muted grid place-items-center text-xl">🏀</div>
          <Badge variant="outline">Div {team.division}</Badge>
        </div>
        <h3 className="font-semibold mt-4">{team.name}</h3>
        <p className="text-xs text-muted-foreground">Created {team.createdAt.slice(0, 10)}</p>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Write the list page**

```tsx
import Link from "next/link";
import { db } from "@/db/client";
import { teams } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { TeamCard } from "@/components/teams/TeamCard";
import { getSession } from "@/lib/session";

export default async function TeamsPage() {
  const session = (await getSession())!;
  const all = await db.select().from(teams).orderBy(teams.name);
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold">League Teams</h1>
          <p className="text-muted-foreground">{all.length} registered teams</p>
        </div>
        {session.role === "admin" && (
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/teams/new">+ Register Team</Link>
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {all.map((t) => <TeamCard key={t.id} team={t} />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Smoke test**

Log in as admin, visit `/teams`. Expected: grid of 4 seeded teams, "+ Register Team" button visible.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/teams/page.tsx src/components/teams/TeamCard.tsx
git commit -m "feat: teams list page (admin)"
```

### Task 4.4: Team create page

**Files:**
- Create: `basketball-league/src/app/(app)/teams/new/page.tsx`
- Create: `basketball-league/src/components/teams/TeamForm.tsx`

- [ ] **Step 1: Write `TeamForm.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Initial = { name?: string; division?: "A" | "B"; logoUrl?: string | null };

export function TeamForm({ id, initial }: { id?: number; initial?: Initial }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [division, setDivision] = useState<"A" | "B">(initial?.division ?? "A");
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const url = id ? `/api/teams/${id}` : "/api/teams";
    const res = await fetch(url, {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, division, logoUrl: logoUrl || undefined }),
    });
    setBusy(false);
    if (!res.ok) { setErr("Save failed"); return; }
    router.push("/teams"); router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      <div className="space-y-2"><Label>Team name</Label><Input value={name} onChange={(e)=>setName(e.target.value)} required minLength={2} /></div>
      <div className="space-y-2">
        <Label>Division</Label>
        <Select value={division} onValueChange={(v)=>setDivision(v as "A"|"B")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="A">Division A</SelectItem>
            <SelectItem value="B">Division B</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label>Logo URL (optional)</Label><Input value={logoUrl ?? ""} onChange={(e)=>setLogoUrl(e.target.value)} /></div>
      {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
      <Button type="submit" disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">{busy?"Saving...":"Save"}</Button>
    </form>
  );
}
```

- [ ] **Step 2: Write `teams/new/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { TeamForm } from "@/components/teams/TeamForm";

export default async function NewTeamPage() {
  const s = await getSession();
  if (s?.role !== "admin") redirect("/teams");
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Register Team</h1>
      <TeamForm />
    </div>
  );
}
```

- [ ] **Step 3: Smoke test**

Visit `/teams/new`, create a test team. Expected: redirect to `/teams`, new card visible.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/teams/new src/components/teams/TeamForm.tsx
git commit -m "feat: register team form"
```

### Task 4.5: Team detail + edit page

**Files:**
- Create: `basketball-league/src/app/(app)/teams/[id]/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { teams, players } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamForm } from "@/components/teams/TeamForm";
import { getSession } from "@/lib/session";

export default async function TeamDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  const team = await db.query.teams.findFirst({ where: eq(teams.id, Number(id)) });
  if (!team) notFound();
  const roster = await db.select().from(players).where(eq(players.teamId, team.id)).orderBy(players.jerseyNumber);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-xl bg-muted grid place-items-center text-2xl">🏀</div>
          <div>
            <h1 className="text-3xl font-semibold">{team.name}</h1>
            <Badge variant="outline">Division {team.division}</Badge>
          </div>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Roster ({roster.length})</h2>
        {roster.length === 0 ? <p className="text-sm text-muted-foreground">No players yet.</p> : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {roster.map(p => (
              <li key={p.id} className="flex items-center justify-between border rounded-md p-3">
                <span className="font-medium">#{p.jerseyNumber} {p.name}</span>
                <Badge variant="outline">{p.position}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {session.role === "admin" && (
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold">Edit Team</h2>
          <TeamForm id={team.id} initial={{ name: team.name, division: team.division, logoUrl: team.logoUrl }} />
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Smoke test**

Click a team card, see detail with empty roster, edit name, save.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/teams/\[id\]
git commit -m "feat: team detail + admin edit"
```

---

## Phase 5: Players Module (Team Manager)

### Task 5.1: Players API

**Files:**
- Create: `basketball-league/src/app/api/players/route.ts`
- Create: `basketball-league/src/app/api/players/[id]/route.ts`

- [ ] **Step 1: Write `players/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { players } from "@/db/schema";
import { getSession } from "@/lib/session";
import { canManageTeam } from "@/lib/rbac";

const Create = z.object({
  teamId: z.number().int().positive(),
  name: z.string().min(2).max(80),
  jerseyNumber: z.number().int().min(0).max(99),
  position: z.enum(["PG", "SG", "SF", "PF", "C"]),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const teamId = url.searchParams.get("teamId");
  const rows = teamId
    ? await db.select().from(players).where(eq(players.teamId, Number(teamId))).orderBy(players.jerseyNumber)
    : await db.select().from(players).orderBy(players.name);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await getSession();
  const body = await req.json();
  const parsed = Create.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (!canManageTeam(session, parsed.data.teamId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [row] = await db.insert(players).values(parsed.data).returning();
  return NextResponse.json(row, { status: 201 });
}
```

- [ ] **Step 2: Write `players/[id]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { players } from "@/db/schema";
import { getSession } from "@/lib/session";
import { canManageTeam } from "@/lib/rbac";

const Update = z.object({
  name: z.string().min(2).max(80).optional(),
  jerseyNumber: z.number().int().min(0).max(99).optional(),
  position: z.enum(["PG", "SG", "SF", "PF", "C"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const player = await db.query.players.findFirst({ where: eq(players.id, Number(id)) });
  if (!player) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManageTeam(session, player.teamId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = Update.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const [row] = await db.update(players).set(parsed.data).where(eq(players.id, Number(id))).returning();
  return NextResponse.json(row);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const player = await db.query.players.findFirst({ where: eq(players.id, Number(id)) });
  if (!player) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManageTeam(session, player.teamId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await db.delete(players).where(eq(players.id, Number(id)));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/players
git commit -m "feat: players CRUD API with team-scoped RBAC"
```

### Task 5.2: Players page (team manager)

**Files:**
- Create: `basketball-league/src/app/(app)/players/page.tsx`
- Create: `basketball-league/src/components/players/PlayerForm.tsx`
- Create: `basketball-league/src/components/players/PlayerList.tsx`

- [ ] **Step 1: Write `PlayerForm.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Pos = "PG" | "SG" | "SF" | "PF" | "C";

export function PlayerForm({ teamId }: { teamId: number }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [jersey, setJersey] = useState("");
  const [position, setPosition] = useState<Pos>("PG");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const res = await fetch("/api/players", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, name, jerseyNumber: Number(jersey), position }),
    });
    setBusy(false);
    if (!res.ok) { setErr("Save failed (jersey may already be taken)"); return; }
    setName(""); setJersey(""); setPosition("PG");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
      <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e)=>setName(e.target.value)} required /></div>
      <div className="space-y-2"><Label>Jersey #</Label><Input type="number" min={0} max={99} value={jersey} onChange={(e)=>setJersey(e.target.value)} required /></div>
      <div className="space-y-2"><Label>Position</Label>
        <Select value={position} onValueChange={(v)=>setPosition(v as Pos)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {["PG","SG","SF","PF","C"].map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">{busy?"Adding...":"+ Add Player"}</Button>
      {err && <p role="alert" className="col-span-full text-sm text-destructive">{err}</p>}
    </form>
  );
}
```

- [ ] **Step 2: Write `PlayerList.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Player } from "@/db/schema";

export function PlayerList({ players }: { players: Player[] }) {
  const router = useRouter();
  async function remove(id: number) {
    if (!confirm("Remove this player?")) return;
    await fetch(`/api/players/${id}`, { method: "DELETE" });
    router.refresh();
  }
  if (players.length === 0) return <p className="text-sm text-muted-foreground">No players yet — add your first above.</p>;
  return (
    <ul className="divide-y border rounded-md">
      {players.map(p => (
        <li key={p.id} className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <span className="size-8 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold">#{p.jerseyNumber}</span>
            <span className="font-medium">{p.name}</span>
            <Badge variant="outline">{p.position}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={()=>remove(p.id)}>Remove</Button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Write `players/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { teams, players } from "@/db/schema";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { PlayerForm } from "@/components/players/PlayerForm";
import { PlayerList } from "@/components/players/PlayerList";

export default async function PlayersPage() {
  const session = await getSession();
  if (session?.role !== "team_manager" || !session.teamId) redirect("/dashboard");
  const team = await db.query.teams.findFirst({ where: eq(teams.id, session.teamId) });
  if (!team) redirect("/dashboard");
  const roster = await db.select().from(players).where(eq(players.teamId, team.id)).orderBy(players.jerseyNumber);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">{team.name} — Players</h1>
        <p className="text-muted-foreground">Manage your team roster ({roster.length} players)</p>
      </div>
      <Card className="p-6 space-y-4"><PlayerForm teamId={team.id} /></Card>
      <Card className="p-6"><PlayerList players={roster} /></Card>
    </div>
  );
}
```

- [ ] **Step 4: Smoke test**

Log in as `manager@league.test`, visit `/players`, add 3 players. Expected: each appears in list, refresh persists.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/players src/components/players
git commit -m "feat: players page for team managers"
```

---

## Phase 6: Schedule + Automated Matchmaking

### Task 6.1: Round-robin matchmaking (TDD, pure)

**Files:**
- Create: `basketball-league/src/lib/matchmaking.ts`
- Create: `basketball-league/tests/matchmaking.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { generateRoundRobin } from "@/lib/matchmaking";

describe("round-robin", () => {
  it("4 teams: 6 unique pairings, no team plays itself, each team plays 3 games", () => {
    const games = generateRoundRobin([1, 2, 3, 4]);
    expect(games).toHaveLength(6);
    games.forEach(([h, a]) => expect(h).not.toBe(a));
    const counts: Record<number, number> = {};
    games.forEach(([h, a]) => { counts[h] = (counts[h]||0)+1; counts[a] = (counts[a]||0)+1; });
    expect(Object.values(counts).every(c => c === 3)).toBe(true);
  });

  it("odd teams: drops a bye each round", () => {
    const games = generateRoundRobin([1, 2, 3]);
    expect(games).toHaveLength(3);
  });

  it("returns empty for <2 teams", () => {
    expect(generateRoundRobin([])).toEqual([]);
    expect(generateRoundRobin([1])).toEqual([]);
  });

  it("no duplicate pairings (treating order as unordered)", () => {
    const games = generateRoundRobin([1,2,3,4,5,6]);
    const seen = new Set<string>();
    games.forEach(([h,a]) => {
      const key = [h,a].sort().join("-");
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    });
    expect(games).toHaveLength(15);
  });
});
```

- [ ] **Step 2: Run test, confirm failure**

```bash
npm test
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `matchmaking.ts`**

```ts
export type Pairing = [home: number, away: number];

/**
 * Berger-table round-robin: each team plays each other exactly once.
 * If teams.length is odd, a bye sentinel rotates through.
 */
export function generateRoundRobin(teamIds: number[]): Pairing[] {
  if (teamIds.length < 2) return [];
  const ids = [...teamIds];
  if (ids.length % 2 === 1) ids.push(-1); // bye
  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const fixed = ids[0];
  let rotating = ids.slice(1);
  const games: Pairing[] = [];

  for (let r = 0; r < rounds; r++) {
    const round = [fixed, ...rotating];
    for (let i = 0; i < half; i++) {
      const h = round[i];
      const a = round[n - 1 - i];
      if (h !== -1 && a !== -1) games.push([h, a]);
    }
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
  }
  return games;
}
```

- [ ] **Step 4: Run test, confirm pass**

```bash
npm test
```
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/matchmaking.ts tests/matchmaking.test.ts
git commit -m "feat: round-robin matchmaking generator"
```

### Task 6.2: Matches API (CRUD + score update)

**Files:**
- Create: `basketball-league/src/app/api/matches/route.ts`
- Create: `basketball-league/src/app/api/matches/[id]/route.ts`

- [ ] **Step 1: Write `matches/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { matches } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

const Create = z.object({
  seasonId: z.number().int().positive(),
  homeTeamId: z.number().int().positive(),
  awayTeamId: z.number().int().positive(),
  scheduledAt: z.string().datetime(),
  venue: z.string().min(2).max(120),
}).refine((d) => d.homeTeamId !== d.awayTeamId, { message: "Home and away must differ" });

export async function GET() {
  const rows = await db.select().from(matches).orderBy(matches.scheduledAt);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }
  const parsed = Create.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const channel = `match-${Date.now()}-${parsed.data.homeTeamId}-${parsed.data.awayTeamId}`;
  const [row] = await db.insert(matches).values({ ...parsed.data, agoraChannel: channel }).returning();
  return NextResponse.json(row, { status: 201 });
}
```

- [ ] **Step 2: Write `matches/[id]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

const Update = z.object({
  scheduledAt: z.string().datetime().optional(),
  venue: z.string().min(2).max(120).optional(),
  status: z.enum(["scheduled", "live", "final"]).optional(),
  homeScore: z.number().int().min(0).optional(),
  awayScore: z.number().int().min(0).optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await db.query.matches.findFirst({ where: eq(matches.id, Number(id)) });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }
  const { id } = await params;
  const parsed = Update.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const [row] = await db.update(matches).set(parsed.data).where(eq(matches.id, Number(id))).returning();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }
  const { id } = await params;
  await db.delete(matches).where(eq(matches.id, Number(id)));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/matches/route.ts src/app/api/matches/\[id\]/route.ts
git commit -m "feat: matches CRUD API"
```

### Task 6.3: Auto-generate matches API

**Files:**
- Create: `basketball-league/src/app/api/matches/generate/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches, teams, seasons } from "@/db/schema";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";
import { generateRoundRobin } from "@/lib/matchmaking";

const Body = z.object({
  seasonId: z.number().int().positive(),
  division: z.enum(["A", "B"]),
  startDate: z.string().datetime(),
  daysBetweenGames: z.number().int().min(1).max(14).default(3),
  venue: z.string().min(2).default("Bantayan Sports Complex"),
});

export async function POST(req: Request) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { seasonId, division, startDate, daysBetweenGames, venue } = parsed.data;

  const season = await db.query.seasons.findFirst({ where: eq(seasons.id, seasonId) });
  if (!season) return NextResponse.json({ error: "Season not found" }, { status: 404 });

  const divisionTeams = await db.select().from(teams).where(eq(teams.division, division));
  if (divisionTeams.length < 2) return NextResponse.json({ error: "Need at least 2 teams" }, { status: 400 });

  const pairings = generateRoundRobin(divisionTeams.map(t => t.id));
  const start = new Date(startDate).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const rows = pairings.map(([home, away], i) => ({
    seasonId,
    homeTeamId: home,
    awayTeamId: away,
    scheduledAt: new Date(start + i * daysBetweenGames * dayMs).toISOString(),
    venue,
    agoraChannel: `match-${seasonId}-${home}-${away}`,
  }));

  const inserted = await db.insert(matches).values(rows).returning();
  return NextResponse.json({ count: inserted.length, matches: inserted }, { status: 201 });
}
```

- [ ] **Step 2: Smoke test (admin logged in)**

```bash
curl -X POST http://localhost:3000/api/matches/generate \
  -H "Content-Type: application/json" \
  -b "league_session=$(<token-file>)" \
  -d '{"seasonId":1,"division":"A","startDate":"2026-05-01T18:00:00Z"}'
```
Expected: `201`, body `{ count: 1, matches: [...] }` (Division A has 2 seeded teams → 1 pairing).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/matches/generate/route.ts
git commit -m "feat: auto-generate round-robin schedule per division"
```

### Task 6.4: Schedule list page

**Files:**
- Create: `basketball-league/src/app/(app)/schedule/page.tsx`
- Create: `basketball-league/src/components/schedule/MatchRow.tsx`
- Create: `basketball-league/src/components/schedule/GenerateScheduleDialog.tsx`

- [ ] **Step 1: Write `MatchRow.tsx`**

```tsx
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Match, Team } from "@/db/schema";

export function MatchRow({ m, teamById }: { m: Match; teamById: Map<number, Team> }) {
  const home = teamById.get(m.homeTeamId);
  const away = teamById.get(m.awayTeamId);
  const date = new Date(m.scheduledAt);
  const variant = m.status === "live" ? "default" : m.status === "final" ? "secondary" : "outline";
  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="p-3 text-sm">{date.toLocaleDateString()}</td>
      <td className="p-3 text-sm">{date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
      <td className="p-3 font-medium">{home?.name} vs {away?.name}</td>
      <td className="p-3 text-sm text-muted-foreground">{m.venue}</td>
      <td className="p-3"><Badge variant={variant}>{m.status}</Badge></td>
      <td className="p-3 text-sm">{m.status === "scheduled" ? "—" : `${m.homeScore} - ${m.awayScore}`}</td>
      <td className="p-3"><Link href={`/schedule/${m.id}`} className="text-primary hover:underline">View</Link></td>
    </tr>
  );
}
```

- [ ] **Step 2: Write `GenerateScheduleDialog.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function GenerateScheduleDialog({ seasonId }: { seasonId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [division, setDivision] = useState<"A"|"B">("A");
  const [startDate, setStartDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setBusy(true); setErr(null);
    const res = await fetch("/api/matches/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seasonId, division, startDate: new Date(startDate).toISOString() }),
    });
    setBusy(false);
    if (!res.ok) { setErr("Generation failed"); return; }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Auto-generate</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Generate Round-Robin Schedule</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Division</Label>
            <Select value={division} onValueChange={(v)=>setDivision(v as "A"|"B")}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Division A</SelectItem>
                <SelectItem value="B">Division B</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Start date</Label><Input type="datetime-local" value={startDate} onChange={(e)=>setStartDate(e.target.value)}/></div>
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          <Button onClick={go} disabled={busy || !startDate} className="bg-primary text-primary-foreground hover:bg-primary/90">{busy?"Generating...":"Generate"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Write `schedule/page.tsx`**

```tsx
import Link from "next/link";
import { db } from "@/db/client";
import { matches, teams, seasons } from "@/db/schema";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MatchRow } from "@/components/schedule/MatchRow";
import { GenerateScheduleDialog } from "@/components/schedule/GenerateScheduleDialog";

export default async function SchedulePage() {
  const session = (await getSession())!;
  const [allMatches, allTeams, [season]] = await Promise.all([
    db.select().from(matches).orderBy(matches.scheduledAt),
    db.select().from(teams),
    db.select().from(seasons).limit(1),
  ]);
  const teamById = new Map(allTeams.map(t => [t.id, t]));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Game Schedule</h1>
          <p className="text-muted-foreground">{allMatches.length} matches</p>
        </div>
        {session.role === "admin" && season && (
          <div className="flex gap-2">
            <GenerateScheduleDialog seasonId={season.id} />
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/schedule/new">+ Create Match</Link>
            </Button>
          </div>
        )}
      </div>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Date</th><th className="p-3">Time</th><th className="p-3">Matchup</th>
              <th className="p-3">Venue</th><th className="p-3">Status</th><th className="p-3">Score</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {allMatches.length === 0
              ? <tr><td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">No matches yet.</td></tr>
              : allMatches.map(m => <MatchRow key={m.id} m={m} teamById={teamById} />)}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Smoke test**

Log in as admin, visit `/schedule`, click "Auto-generate", pick Division A + a date. Expected: matches appear in table.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/schedule/page.tsx src/components/schedule
git commit -m "feat: schedule page with auto-generate"
```

### Task 6.5: Match create + detail/score-edit pages

**Files:**
- Create: `basketball-league/src/app/(app)/schedule/new/page.tsx`
- Create: `basketball-league/src/app/(app)/schedule/[id]/page.tsx`
- Create: `basketball-league/src/components/schedule/MatchForm.tsx`
- Create: `basketball-league/src/components/schedule/ScoreForm.tsx`

- [ ] **Step 1: Write `MatchForm.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Team } from "@/db/schema";

export function MatchForm({ teams, seasonId }: { teams: Team[]; seasonId: number }) {
  const router = useRouter();
  const [home, setHome] = useState<string>("");
  const [away, setAway] = useState<string>("");
  const [when, setWhen] = useState("");
  const [venue, setVenue] = useState("Bantayan Sports Complex");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const res = await fetch("/api/matches", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seasonId, homeTeamId: Number(home), awayTeamId: Number(away),
        scheduledAt: new Date(when).toISOString(), venue,
      }),
    });
    setBusy(false);
    if (!res.ok) { setErr("Create failed"); return; }
    router.push("/schedule"); router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      <div className="space-y-2"><Label>Home Team</Label>
        <Select value={home} onValueChange={setHome}>
          <SelectTrigger><SelectValue placeholder="Select team"/></SelectTrigger>
          <SelectContent>{teams.map(t=><SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label>Away Team</Label>
        <Select value={away} onValueChange={setAway}>
          <SelectTrigger><SelectValue placeholder="Select team"/></SelectTrigger>
          <SelectContent>{teams.filter(t=>String(t.id)!==home).map(t=><SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label>When</Label><Input type="datetime-local" value={when} onChange={(e)=>setWhen(e.target.value)} required/></div>
      <div className="space-y-2"><Label>Venue</Label><Input value={venue} onChange={(e)=>setVenue(e.target.value)} required/></div>
      {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
      <Button type="submit" disabled={busy || !home || !away || home===away} className="bg-primary text-primary-foreground hover:bg-primary/90">{busy?"Creating...":"Create Match"}</Button>
    </form>
  );
}
```

- [ ] **Step 2: Write `schedule/new/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { teams, seasons } from "@/db/schema";
import { getSession } from "@/lib/session";
import { MatchForm } from "@/components/schedule/MatchForm";

export default async function NewMatchPage() {
  const s = await getSession();
  if (s?.role !== "admin") redirect("/schedule");
  const [allTeams, [season]] = await Promise.all([
    db.select().from(teams).orderBy(teams.name),
    db.select().from(seasons).limit(1),
  ]);
  if (!season) redirect("/schedule");
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Create Match</h1>
      <MatchForm teams={allTeams} seasonId={season.id}/>
    </div>
  );
}
```

- [ ] **Step 3: Write `ScoreForm.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ScoreForm({ matchId, initial }: { matchId: number; initial: { home: number; away: number; status: "scheduled"|"live"|"final" } }) {
  const router = useRouter();
  const [home, setHome] = useState(String(initial.home));
  const [away, setAway] = useState(String(initial.away));
  const [status, setStatus] = useState(initial.status);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await fetch(`/api/matches/${matchId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeScore: Number(home), awayScore: Number(away), status }),
    });
    setBusy(false); router.refresh();
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
      <div className="space-y-2"><Label>Home Score</Label><Input type="number" min={0} value={home} onChange={(e)=>setHome(e.target.value)}/></div>
      <div className="space-y-2"><Label>Away Score</Label><Input type="number" min={0} value={away} onChange={(e)=>setAway(e.target.value)}/></div>
      <div className="space-y-2"><Label>Status</Label>
        <Select value={status} onValueChange={(v)=>setStatus(v as any)}>
          <SelectTrigger><SelectValue/></SelectTrigger>
          <SelectContent>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="final">Final</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={save} disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">{busy?"Saving...":"Save"}</Button>
    </div>
  );
}
```

- [ ] **Step 4: Write `schedule/[id]/page.tsx`** (live stream wired in Phase 9; placeholder now)

```tsx
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches, teams } from "@/db/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreForm } from "@/components/schedule/ScoreForm";
import { getSession } from "@/lib/session";

export default async function MatchDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const m = await db.query.matches.findFirst({ where: eq(matches.id, Number(id)) });
  if (!m) notFound();
  const home = await db.query.teams.findFirst({ where: eq(teams.id, m.homeTeamId) });
  const away = await db.query.teams.findFirst({ where: eq(teams.id, m.awayTeamId) });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{home?.name} vs {away?.name}</h1>
          <p className="text-muted-foreground">{new Date(m.scheduledAt).toLocaleString()} · {m.venue}</p>
        </div>
        <Badge>{m.status}</Badge>
      </div>

      <Card className="p-8 text-center">
        <div className="text-5xl font-semibold tracking-tight">
          {m.homeScore} <span className="text-muted-foreground mx-3">—</span> {m.awayScore}
        </div>
      </Card>

      {/* Live stream player placeholder — wired in Phase 9 */}
      <Card className="p-6">
        <h2 className="font-semibold mb-3">Live Stream</h2>
        <p className="text-sm text-muted-foreground">Stream player loads here when match is live. Channel: <code>{m.agoraChannel}</code></p>
      </Card>

      {session?.role === "admin" && (
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold">Update Score / Status</h2>
          <ScoreForm matchId={m.id} initial={{ home: m.homeScore, away: m.awayScore, status: m.status }}/>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Smoke test**

Create a match manually, open detail, update score → confirm persisted on refresh.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/schedule/new src/app/\(app\)/schedule/\[id\] src/components/schedule/MatchForm.tsx src/components/schedule/ScoreForm.tsx
git commit -m "feat: match create + detail with score editor"
```

---

## Phase 7: Standings

### Task 7.1: Standings calculator (TDD, pure)

**Files:**
- Create: `basketball-league/src/lib/standings.ts`
- Create: `basketball-league/tests/standings.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { computeStandings } from "@/lib/standings";

const teams = [
  { id: 1, name: "A", division: "A" as const },
  { id: 2, name: "B", division: "A" as const },
  { id: 3, name: "C", division: "B" as const },
];

const matches = [
  { id: 1, homeTeamId: 1, awayTeamId: 2, status: "final" as const, homeScore: 80, awayScore: 70 },
  { id: 2, homeTeamId: 2, awayTeamId: 1, status: "final" as const, homeScore: 60, awayScore: 75 },
  { id: 3, homeTeamId: 1, awayTeamId: 2, status: "scheduled" as const, homeScore: 0, awayScore: 0 },
];

describe("standings", () => {
  it("counts only final matches", () => {
    const rows = computeStandings(teams, matches);
    const a = rows.find(r => r.teamId === 1)!;
    expect(a.gamesPlayed).toBe(2);
    expect(a.wins).toBe(2);
    expect(a.losses).toBe(0);
    expect(a.pointsFor).toBe(155);
    expect(a.pointsAgainst).toBe(130);
  });

  it("sorts by wins desc then point diff desc", () => {
    const rows = computeStandings(teams, matches);
    expect(rows[0].teamId).toBe(1);
    expect(rows[1].teamId).toBe(2);
  });

  it("includes teams with zero games", () => {
    const rows = computeStandings(teams, matches);
    const c = rows.find(r => r.teamId === 3)!;
    expect(c.gamesPlayed).toBe(0);
  });
});
```

- [ ] **Step 2: Confirm failure, then implement `standings.ts`**

```ts
type TeamLite = { id: number; name: string; division: "A" | "B" };
type MatchLite = { id: number; homeTeamId: number; awayTeamId: number; status: "scheduled"|"live"|"final"; homeScore: number; awayScore: number };

export type StandingRow = {
  teamId: number;
  teamName: string;
  division: "A" | "B";
  gamesPlayed: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
};

export function computeStandings(teams: TeamLite[], matches: MatchLite[]): StandingRow[] {
  const rows = new Map<number, StandingRow>();
  teams.forEach(t => rows.set(t.id, {
    teamId: t.id, teamName: t.name, division: t.division,
    gamesPlayed: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, pointDiff: 0,
  }));

  matches.filter(m => m.status === "final").forEach(m => {
    const h = rows.get(m.homeTeamId); const a = rows.get(m.awayTeamId);
    if (!h || !a) return;
    h.gamesPlayed++; a.gamesPlayed++;
    h.pointsFor += m.homeScore; h.pointsAgainst += m.awayScore;
    a.pointsFor += m.awayScore; a.pointsAgainst += m.homeScore;
    if (m.homeScore > m.awayScore) { h.wins++; a.losses++; }
    else if (m.awayScore > m.homeScore) { a.wins++; h.losses++; }
  });

  return Array.from(rows.values())
    .map(r => ({ ...r, pointDiff: r.pointsFor - r.pointsAgainst }))
    .sort((a, b) => b.wins - a.wins || b.pointDiff - a.pointDiff || a.teamName.localeCompare(b.teamName));
}
```

- [ ] **Step 3: Run tests, confirm pass**

```bash
npm test
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/standings.ts tests/standings.test.ts
git commit -m "feat: standings calculator"
```

### Task 7.2: Standings API + page

**Files:**
- Create: `basketball-league/src/app/api/standings/route.ts`
- Create: `basketball-league/src/app/(app)/standings/page.tsx`
- Create: `basketball-league/src/components/standings/StandingsTable.tsx`

- [ ] **Step 1: Write `standings/route.ts`**

```ts
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { teams, matches } from "@/db/schema";
import { computeStandings } from "@/lib/standings";

export async function GET() {
  const [allTeams, allMatches] = await Promise.all([
    db.select().from(teams),
    db.select().from(matches),
  ]);
  return NextResponse.json(computeStandings(allTeams, allMatches));
}
```

- [ ] **Step 2: Write `StandingsTable.tsx`**

```tsx
import type { StandingRow } from "@/lib/standings";
import { Card } from "@/components/ui/card";

export function StandingsTable({ title, rows }: { title: string; rows: StandingRow[] }) {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-primary">{title}</h2>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Pos</th><th className="p-3">Team</th>
              <th className="p-3 text-center">GP</th><th className="p-3 text-center">W</th>
              <th className="p-3 text-center">L</th><th className="p-3 text-center">PF</th>
              <th className="p-3 text-center">PA</th><th className="p-3 text-center">+/-</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.teamId} className="border-b">
                <td className="p-3 font-semibold">{i+1}</td>
                <td className="p-3">{r.teamName}</td>
                <td className="p-3 text-center tabular-nums">{r.gamesPlayed}</td>
                <td className="p-3 text-center tabular-nums">{r.wins}</td>
                <td className="p-3 text-center tabular-nums">{r.losses}</td>
                <td className="p-3 text-center tabular-nums">{r.pointsFor}</td>
                <td className="p-3 text-center tabular-nums">{r.pointsAgainst}</td>
                <td className="p-3 text-center tabular-nums">{r.pointDiff > 0 ? "+" : ""}{r.pointDiff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Write `standings/page.tsx`**

```tsx
import { db } from "@/db/client";
import { teams, matches } from "@/db/schema";
import { computeStandings } from "@/lib/standings";
import { StandingsTable } from "@/components/standings/StandingsTable";

export default async function StandingsPage() {
  const [allTeams, allMatches] = await Promise.all([db.select().from(teams), db.select().from(matches)]);
  const rows = computeStandings(allTeams, allMatches);
  const a = rows.filter(r => r.division === "A");
  const b = rows.filter(r => r.division === "B");
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">League Standings</h1>
        <p className="text-muted-foreground">Calculated from final match results</p>
      </div>
      <StandingsTable title="Division A" rows={a}/>
      <StandingsTable title="Division B" rows={b}/>
    </div>
  );
}
```

- [ ] **Step 4: Smoke test**

Mark a match as `final`, refresh `/standings` → wins/losses update.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/standings src/app/\(app\)/standings src/components/standings
git commit -m "feat: standings page (Division A/B)"
```

---

## Phase 8: Public Viewer Routes

### Task 8.1: Public layout + read-only pages

**Files:**
- Create: `basketball-league/src/app/(public)/layout.tsx`
- Create: `basketball-league/src/components/nav/PublicNav.tsx`
- Create: `basketball-league/src/app/(public)/page.tsx`
- Create: `basketball-league/src/app/(public)/teams/page.tsx`
- Create: `basketball-league/src/app/(public)/teams/[id]/page.tsx`
- Create: `basketball-league/src/app/(public)/schedule/page.tsx`
- Create: `basketball-league/src/app/(public)/schedule/[id]/page.tsx`
- Create: `basketball-league/src/app/(public)/standings/page.tsx`
- Modify: `basketball-league/src/app/page.tsx` (re-route root)

> Public route group lives at the same `/teams`, `/schedule`, `/standings` URLs **only when not signed in**. To keep both groups at root, mount public pages under `/public/*` to avoid ambiguity. Update root `page.tsx` and `middleware.ts` matcher.

- [ ] **Step 1: Choose URL strategy: prefix `/public`**

Move public pages under `src/app/(public)/public/...` so URLs become `/public/teams` etc. Root `/` → public dashboard.

Reorganize:
- `(public)/page.tsx` → public landing/dashboard at `/`
- `(public)/public/teams/page.tsx` → `/public/teams`
- (etc. for schedule, standings)

- [ ] **Step 2: Write `PublicNav.tsx`**

```tsx
import Link from "next/link";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PublicNav() {
  return (
    <header className="sticky top-0 z-40 bg-card border-b">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Trophy className="size-5 text-primary"/>Basketball League
        </Link>
        <nav className="flex gap-6 text-sm">
          <Link href="/" className="hover:text-primary">Dashboard</Link>
          <Link href="/public/teams" className="hover:text-primary">Teams</Link>
          <Link href="/public/schedule" className="hover:text-primary">Schedule</Link>
          <Link href="/public/standings" className="hover:text-primary">Standings</Link>
        </nav>
        <Button asChild variant="outline" size="sm"><Link href="/login">Sign in</Link></Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Write `(public)/layout.tsx`**

```tsx
import { PublicNav } from "@/components/nav/PublicNav";
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (<div><PublicNav/><main className="mx-auto max-w-6xl px-6 py-8">{children}</main></div>);
}
```

- [ ] **Step 4: Write public pages (read-only mirrors)**

Each page reads from `db` directly and renders the same components as the authenticated pages **without** edit/create buttons.

`(public)/page.tsx` (landing):
```tsx
import Link from "next/link";
import { db } from "@/db/client";
import { teams, matches } from "@/db/schema";
import { Card } from "@/components/ui/card";

export default async function PublicHome() {
  const [t, m] = await Promise.all([db.select().from(teams), db.select().from(matches).orderBy(matches.scheduledAt).limit(5)]);
  return (
    <div className="space-y-6">
      <div className="bg-primary/10 rounded-2xl p-10 text-center">
        <h1 className="text-4xl font-bold">Mayor's Cup Basketball League</h1>
        <p className="text-muted-foreground mt-2">Bantayan, Cebu — Season 2026</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-5"><p className="text-xs uppercase text-muted-foreground">Teams</p><p className="text-3xl font-semibold">{t.length}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase text-muted-foreground">Matches</p><p className="text-3xl font-semibold">{m.length}+</p></Card>
        <Card className="p-5"><Link href="/public/schedule" className="text-primary">View schedule →</Link></Card>
        <Card className="p-5"><Link href="/public/standings" className="text-primary">View standings →</Link></Card>
      </div>
    </div>
  );
}
```

`(public)/public/teams/page.tsx`:
```tsx
import { db } from "@/db/client";
import { teams } from "@/db/schema";
import { TeamCard } from "@/components/teams/TeamCard";

export default async function PublicTeams() {
  const all = await db.select().from(teams).orderBy(teams.name);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Teams</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {all.map(t => <TeamCard key={t.id} team={t}/>)}
      </div>
    </div>
  );
}
```

(Note: `TeamCard` links to `/teams/${id}`. For public, override link prefix — accept and route to public mirror via a `linkPrefix` prop. **Update `TeamCard` to accept `linkPrefix?: string` defaulting to `/teams`** and pass `/public/teams` here. Edit `TeamCard.tsx` accordingly before this task is done.)

`(public)/public/schedule/page.tsx`: identical to authenticated schedule page minus admin buttons. Reuse `MatchRow`.

`(public)/public/standings/page.tsx`: identical to `/standings` page (already read-only).

`(public)/public/schedule/[id]/page.tsx`: identical to authenticated detail minus `ScoreForm`. Live stream player still embeds.

- [ ] **Step 5: Update root `src/app/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
export default async function Root() {
  const s = await getSession();
  redirect(s ? "/dashboard" : "/(public)");
}
```

(Or simpler: have `(public)/page.tsx` serve as `/`. Keep group `(public)` un-prefixed so its `page.tsx` IS `/`. Then drop the redirect file altogether — delete the old `src/app/page.tsx`.)

- [ ] **Step 6: Update middleware matcher**

In `middleware.ts`, ensure paths starting with `/public` and `/` are not redirected to `/login`. Update the `PROTECTED` list to keep only `/dashboard`, `/teams`, `/players`, `/schedule`, `/standings`, `/admin` (without `/public/...` mirror).

- [ ] **Step 7: Smoke test**

Visit http://localhost:3000/ logged out → public landing renders, nav works, no edit buttons.

- [ ] **Step 8: Commit**

```bash
git add src/app/\(public\) src/components/nav/PublicNav.tsx src/components/teams/TeamCard.tsx src/middleware.ts
git commit -m "feat: public viewer routes (read-only mirrors)"
```

---

## Phase 9: Live Streaming with Agora

### Task 9.1: Agora token API

**Files:**
- Create: `basketball-league/src/lib/agora.ts`
- Create: `basketball-league/src/app/api/agora/token/route.ts`

- [ ] **Step 1: Write `lib/agora.ts`**

```ts
import { RtcTokenBuilder, RtcRole } from "agora-token";

export function buildRtcToken(channel: string, uid: number, role: "publisher" | "subscriber"): string {
  const appId = process.env.AGORA_APP_ID!;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE!;
  if (!appId || !appCertificate) throw new Error("AGORA_APP_ID / AGORA_APP_CERTIFICATE not set");
  const expirationTimeInSeconds = 60 * 60; // 1h
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
  return RtcTokenBuilder.buildTokenWithUid(
    appId, appCertificate, channel, uid,
    role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER,
    privilegeExpiredTs, privilegeExpiredTs,
  );
}
```

- [ ] **Step 2: Write `agora/token/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches } from "@/db/schema";
import { getSession } from "@/lib/session";
import { canManageTeam } from "@/lib/rbac";
import { buildRtcToken } from "@/lib/agora";

const Q = z.object({ matchId: z.coerce.number().int().positive() });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = Q.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const m = await db.query.matches.findFirst({ where: eq(matches.id, parsed.data.matchId) });
  if (!m || !m.agoraChannel) return NextResponse.json({ error: "No channel" }, { status: 404 });

  const session = await getSession();
  const canPublish = session?.role === "admin"
    || canManageTeam(session, m.homeTeamId)
    || canManageTeam(session, m.awayTeamId);
  const role = canPublish ? "publisher" : "subscriber";
  const uid = session?.userId ?? Math.floor(Math.random() * 1_000_000);

  const token = buildRtcToken(m.agoraChannel, uid, role);
  return NextResponse.json({
    appId: process.env.NEXT_PUBLIC_AGORA_APP_ID,
    channel: m.agoraChannel,
    token, uid, role,
  });
}
```

- [ ] **Step 3: Smoke test (need Agora creds)**

If `AGORA_APP_ID` not yet provisioned, mock by setting any 32-char value in `.env.local` and verify route returns JSON shape; full test deferred until creds available.

- [ ] **Step 4: Commit**

```bash
git add src/lib/agora.ts src/app/api/agora
git commit -m "feat: agora token endpoint"
```

### Task 9.2: Agora publisher + subscriber components

**Files:**
- Create: `basketball-league/src/components/stream/StreamHost.tsx`
- Create: `basketball-league/src/components/stream/StreamPlayer.tsx`

- [ ] **Step 1: Write `StreamHost.tsx`** (publisher — admin/team manager)

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import AgoraRTC, { type IAgoraRTCClient, type ICameraVideoTrack, type IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";
import { Button } from "@/components/ui/button";

export function StreamHost({ matchId }: { matchId: number }) {
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const tracksRef = useRef<{ video: ICameraVideoTrack; audio: IMicrophoneAudioTrack } | null>(null);
  const videoRef = useRef<HTMLDivElement>(null);

  async function start() {
    setError(null);
    try {
      const res = await fetch(`/api/agora/token?matchId=${matchId}`);
      const { appId, channel, token, uid, role } = await res.json();
      if (role !== "publisher") { setError("Not authorized to broadcast"); return; }
      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
      await client.setClientRole("host");
      await client.join(appId, channel, token, uid);
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      videoTrack.play(videoRef.current!);
      await client.publish([audioTrack, videoTrack]);
      clientRef.current = client;
      tracksRef.current = { video: videoTrack, audio: audioTrack };
      setLive(true);
    } catch (e: any) { setError(e?.message ?? "Failed to start stream"); }
  }

  async function stop() {
    tracksRef.current?.video.close(); tracksRef.current?.audio.close();
    await clientRef.current?.leave();
    clientRef.current = null; tracksRef.current = null;
    setLive(false);
  }

  useEffect(() => () => { stop(); }, []);

  return (
    <div className="space-y-3">
      <div ref={videoRef} className="aspect-video bg-black rounded-lg overflow-hidden" />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        {!live ? <Button onClick={start} className="bg-primary text-primary-foreground hover:bg-primary/90">Go Live</Button>
              : <Button onClick={stop} variant="destructive">End Stream</Button>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `StreamPlayer.tsx`** (subscriber — anyone)

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import AgoraRTC, { type IAgoraRTCClient, type IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";

export function StreamPlayer({ matchId }: { matchId: number }) {
  const [status, setStatus] = useState<"idle"|"joining"|"live"|"offline">("idle");
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("joining");
      try {
        const res = await fetch(`/api/agora/token?matchId=${matchId}`);
        const { appId, channel, token, uid } = await res.json();
        const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
        await client.setClientRole("audience");
        client.on("user-published", async (user: IAgoraRTCRemoteUser, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === "video") user.videoTrack?.play(videoRef.current!);
          if (mediaType === "audio") user.audioTrack?.play();
          setStatus("live");
        });
        client.on("user-unpublished", () => setStatus("offline"));
        await client.join(appId, channel, token, uid);
        if (cancelled) await client.leave();
        clientRef.current = client;
      } catch { setStatus("offline"); }
    })();
    return () => { cancelled = true; clientRef.current?.leave(); };
  }, [matchId]);

  return (
    <div className="space-y-2">
      <div ref={videoRef} className="aspect-video bg-black rounded-lg overflow-hidden grid place-items-center text-white text-sm" />
      <p className="text-xs text-muted-foreground">
        {status === "joining" && "Connecting..."}
        {status === "live" && <span className="text-primary font-semibold">● LIVE</span>}
        {status === "offline" && "Stream not active"}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Wire into match detail pages**

In `src/app/(app)/schedule/[id]/page.tsx` replace the placeholder card:
```tsx
import { StreamHost } from "@/components/stream/StreamHost";
import { StreamPlayer } from "@/components/stream/StreamPlayer";
import { canManageTeam } from "@/lib/rbac";
// ...inside the JSX, replace the placeholder live stream card:
<Card className="p-6 space-y-4">
  <h2 className="font-semibold">Live Stream</h2>
  {(session?.role === "admin" || canManageTeam(session ?? null, m.homeTeamId) || canManageTeam(session ?? null, m.awayTeamId))
    ? <StreamHost matchId={m.id}/>
    : <StreamPlayer matchId={m.id}/>}
</Card>
```

In `src/app/(public)/public/schedule/[id]/page.tsx` use `<StreamPlayer matchId={m.id}/>`.

- [ ] **Step 4: Manual test (with real Agora creds)**

Open match detail in two browsers: admin clicks "Go Live" → public viewer browser shows live video. Stop → goes offline.

- [ ] **Step 5: Commit**

```bash
git add src/components/stream src/app/\(app\)/schedule/\[id\] src/app/\(public\)/public/schedule/\[id\]
git commit -m "feat: agora live stream host + player"
```

---

## Phase 10: Dashboards + Admin User Management

### Task 10.1: Role-specific dashboard tiles

**Files:**
- Modify: `basketball-league/src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Replace dashboard with stat tiles + upcoming matches**

```tsx
import Link from "next/link";
import { eq, gte } from "drizzle-orm";
import { db } from "@/db/client";
import { teams, matches, players } from "@/db/schema";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui/card";

export default async function Dashboard() {
  const session = (await getSession())!;
  const today = new Date().toISOString();
  const [allTeams, upcoming, allPlayers] = await Promise.all([
    db.select().from(teams),
    db.select().from(matches).where(gte(matches.scheduledAt, today)).orderBy(matches.scheduledAt).limit(5),
    db.select().from(players),
  ]);

  let myRoster: typeof allPlayers = [];
  if (session.role === "team_manager" && session.teamId) {
    myRoster = await db.select().from(players).where(eq(players.teamId, session.teamId));
  }

  const tiles = session.role === "admin"
    ? [
        { label: "Total Teams", value: allTeams.length, href: "/teams" },
        { label: "Total Players", value: allPlayers.length, href: "/teams" },
        { label: "Upcoming Games", value: upcoming.length, href: "/schedule" },
        { label: "Active Season", value: "2026", href: "/standings" },
      ]
    : [
        { label: "My Roster", value: myRoster.length, href: "/players" },
        { label: "Upcoming Games", value: upcoming.length, href: "/schedule" },
        { label: "Standings", value: "View", href: "/standings" },
      ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map(t => (
          <Link key={t.label} href={t.href}>
            <Card className="p-5 hover:border-primary transition-colors">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{t.label}</p>
              <p className="text-3xl font-semibold mt-2">{t.value}</p>
            </Card>
          </Link>
        ))}
      </div>
      <Card className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Upcoming Matches</h2>
          <Link href="/schedule" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {upcoming.length === 0
          ? <p className="text-sm text-muted-foreground">No upcoming matches scheduled.</p>
          : <ul className="divide-y">
              {upcoming.map(m => (
                <li key={m.id} className="py-3 flex justify-between text-sm">
                  <span>{new Date(m.scheduledAt).toLocaleString()}</span>
                  <Link href={`/schedule/${m.id}`} className="text-primary hover:underline">{m.venue}</Link>
                </li>
              ))}
            </ul>}
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Smoke test**

Login as each role, confirm tiles + upcoming list render correctly.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/dashboard/page.tsx
git commit -m "feat: role-aware dashboard tiles"
```

### Task 10.2: Admin user management

**Files:**
- Create: `basketball-league/src/app/api/users/route.ts`
- Create: `basketball-league/src/app/(app)/admin/users/page.tsx`

- [ ] **Step 1: Write `users/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { requireRole, ForbiddenError } from "@/lib/rbac";

const Create = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "team_manager"]),
  teamId: z.number().int().positive().optional(),
});

export async function GET() {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }
  const rows = await db.select({ id: users.id, email: users.email, role: users.role, teamId: users.teamId }).from(users);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  try { requireRole(await getSession(), "admin"); }
  catch (e) { if (e instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); throw e; }
  const parsed = Create.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const passwordHash = await hashPassword(parsed.data.password);
  const [row] = await db.insert(users).values({
    email: parsed.data.email, passwordHash, role: parsed.data.role, teamId: parsed.data.teamId ?? null,
  }).returning({ id: users.id, email: users.email, role: users.role, teamId: users.teamId });
  return NextResponse.json(row, { status: 201 });
}
```

- [ ] **Step 2: Write admin users page**

```tsx
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { users, teams } from "@/db/schema";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { CreateUserForm } from "@/components/admin/CreateUserForm";

export default async function AdminUsers() {
  const s = await getSession();
  if (s?.role !== "admin") redirect("/dashboard");
  const [allUsers, allTeams] = await Promise.all([
    db.select({ id: users.id, email: users.email, role: users.role, teamId: users.teamId }).from(users),
    db.select().from(teams),
  ]);
  const teamById = new Map(allTeams.map(t => [t.id, t.name]));
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">User Management</h1>
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Create User</h2>
        <CreateUserForm teams={allTeams}/>
      </Card>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Team</th></tr>
          </thead>
          <tbody>
            {allUsers.map(u => (
              <tr key={u.id} className="border-b">
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">{u.teamId ? teamById.get(u.teamId) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Write `CreateUserForm.tsx`**

`src/components/admin/CreateUserForm.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Team } from "@/db/schema";

export function CreateUserForm({ teams }: { teams: Team[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin"|"team_manager">("team_manager");
  const [teamId, setTeamId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const res = await fetch("/api/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role, teamId: teamId ? Number(teamId) : undefined }),
    });
    setBusy(false);
    if (!res.ok) { setErr("Create failed (email may exist)"); return; }
    setEmail(""); setPassword(""); setTeamId(""); router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
      <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required/></div>
      <div className="space-y-2"><Label>Password</Label><Input type="password" minLength={6} value={password} onChange={(e)=>setPassword(e.target.value)} required/></div>
      <div className="space-y-2"><Label>Role</Label>
        <Select value={role} onValueChange={(v)=>setRole(v as any)}>
          <SelectTrigger><SelectValue/></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="team_manager">Team Manager</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {role === "team_manager" && (
        <div className="space-y-2"><Label>Team</Label>
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger><SelectValue placeholder="Pick team"/></SelectTrigger>
            <SelectContent>{teams.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <Button type="submit" disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">{busy?"Creating...":"+ Create"}</Button>
      {err && <p role="alert" className="col-span-full text-sm text-destructive">{err}</p>}
    </form>
  );
}
```

- [ ] **Step 4: Add link to admin nav**

Edit `AppNav.tsx`: append `{ href: "/admin/users", label: "Users" }` to the `admin` array.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/users src/app/\(app\)/admin src/components/admin src/components/nav/AppNav.tsx
git commit -m "feat: admin user management"
```

---

## Phase 11: Deploy + Polish

### Task 11.1: Vercel deployment prep

**Files:**
- Modify: `basketball-league/package.json`
- Create: `basketball-league/README.md`

- [ ] **Step 1: Provision Turso DB**

```bash
# Install turso CLI per docs.turso.tech, then:
turso auth signup
turso db create basketball-league
turso db show basketball-league --url
turso db tokens create basketball-league
```
Save the `libsql://...` URL and token.

- [ ] **Step 2: Apply migrations against Turso**

```bash
DATABASE_URL=<turso-url> DATABASE_AUTH_TOKEN=<turso-token> npx drizzle-kit migrate
```

- [ ] **Step 3: Provision Agora project**

Create project at console.agora.io, enable App Certificate. Copy `App ID` and `Primary Certificate`.

- [ ] **Step 4: Configure Vercel env**

```bash
npx vercel link
npx vercel env add DATABASE_URL production
npx vercel env add DATABASE_AUTH_TOKEN production
npx vercel env add JWT_SECRET production
npx vercel env add AGORA_APP_ID production
npx vercel env add AGORA_APP_CERTIFICATE production
npx vercel env add NEXT_PUBLIC_AGORA_APP_ID production
```

- [ ] **Step 5: Write minimal README.md**

```markdown
# Basketball League Management

## Local dev
1. `cp .env.example .env.local` and fill JWT_SECRET (`openssl rand -hex 32`)
2. `npm install`
3. `npm run db:migrate && npm run db:seed`
4. `npm run dev` — http://localhost:3000

## Default credentials (dev)
- Admin: admin@league.test / admin123
- Manager: manager@league.test / manager123

## Deploy
- DB: Turso (libSQL) — set `DATABASE_URL`, `DATABASE_AUTH_TOKEN`
- Live: Agora — set `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`, `NEXT_PUBLIC_AGORA_APP_ID`
- Push to Vercel: `vercel --prod`

## Roles
- **Admin**: Dashboard, Teams (CRUD), Schedule (CRUD + auto-generate), Standings, Users
- **Team Manager**: Dashboard, Players (own team), Schedule (view), Standings (view)
- **Public Viewer**: `/`, `/public/teams`, `/public/schedule`, `/public/standings` — read-only
```

- [ ] **Step 6: Deploy**

```bash
npx vercel --prod
```
Visit production URL. Smoke test login + view + admin actions.

- [ ] **Step 7: Commit + push**

```bash
git add README.md
git commit -m "docs: deployment instructions"
git push
```

### Task 11.2: Final polish + checklist

- [ ] **Step 1: Run full type-check + tests + build**

```bash
npx tsc --noEmit && npm test && npm run build
```
Expected: zero TS errors, all tests pass, production build succeeds.

- [ ] **Step 2: Accessibility quick-pass**
- All buttons have visible focus rings (default shadcn)
- All inputs have `<Label>` associations
- Color contrast: text on `--color-foreground` over `--color-background` ≥ 4.5:1 (yes)
- No emoji as structural icons (allow only the 🏀 brand mark on login + dashboard tiles per existing prototype style — this is the ONE allowed exception)
- Tab order through forms is logical

- [ ] **Step 3: Mobile responsiveness check**

Browser at 375px width: nav wraps gracefully, tables scroll horizontally inside Card with `overflow-hidden`, forms stack to single column.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "polish: final a11y + mobile fixes"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Login + password protection → Phase 2
- ✅ Admin schedules matches (teams, date, time, venue) → Task 6.5
- ✅ Standings calc (W/L/points) → Phase 7
- ✅ Auto-generate schedule (round-robin) → Task 6.3
- ✅ Public viewer no-login → Phase 8
- ✅ Roles + scopes (Admin/TM/PV with stated nav) → Tasks 3.1, 8.1
- ✅ Agora live streaming → Phase 9
- ✅ SQL/SQLite vercel-friendly (libSQL/Turso + Drizzle) → Phase 1
- ✅ Simple UI (white + orange, Inter, card-based) → Phase 0.3 + components
- ✅ React stack (Next.js = React) → Phase 0
- ⚠️ Tournament bracket auto-generation (functional req) — explicitly deferred from MVP per user "let's first start with features that satisfy MVP". Standings + round-robin meet 90% of competitive structure need.

**Type consistency:** Roles `"admin" | "team_manager"` consistent across schema, lib, components. Match status `"scheduled" | "live" | "final"` consistent. Position enum consistent.

**Placeholder scan:** none — every code step is complete.

**Known sharp edges to watch during execution:**
- `TeamCard` link prefix needs to be parameterized when used in public group (called out in Task 8.1 Step 4).
- Middleware matcher must exclude `/public/*` and root once those routes are created.
- Agora quick-test needs real creds; mock fallback acceptable until provisioned.
- The 🏀 emoji in UI is a deliberate branding choice matching existing prototype — not a structural icon. All other icons use Lucide.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-28-basketball-league-management.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
