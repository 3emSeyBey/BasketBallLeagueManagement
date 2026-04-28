# Basketball League Management

Web-based management system for the Mayor's Cup Basketball League (Bantayan, Cebu). Built with Next.js, libSQL/Turso (SQLite), Drizzle ORM, and Agora live streaming.

## Roles

- **Admin** — Dashboard, Teams (CRUD), Schedule (CRUD + auto-generate round-robin), Standings, Users
- **Team Manager** — Dashboard, Players (own team only), Schedule (view), Standings (view)
- **Public Viewer** — `/`, `/public/teams`, `/public/schedule`, `/public/standings` — read-only, no login

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment:
   ```bash
   cp .env.example .env.local
   # Generate a 64-hex JWT secret:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   # Paste the value into .env.local as JWT_SECRET
   ```
3. Initialize database:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
4. Start dev server:
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000

## Default credentials (dev seed)

- Admin: `admin@league.test` / `admin123`
- Team Manager: `manager@league.test` / `manager123`

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |
| `npm test` | Run Vitest tests once |
| `npm run test:watch` | Watch-mode tests |
| `npm run db:generate` | Generate Drizzle migration from schema |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed dev data |

## Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui (base-ui primitives)
- **Database:** libSQL (SQLite-compatible) via Drizzle ORM. Local: `file:./dev.db`. Production: Turso.
- **Auth:** bcryptjs + JWT (jose) in HttpOnly cookie + middleware-based RBAC
- **Live streaming:** Agora Web SDK (`agora-rtc-sdk-ng`) + server-issued tokens (`agora-token`)
- **Tests:** Vitest

## Deployment (Vercel + Turso)

1. **Provision Turso DB:**
   ```bash
   turso auth signup
   turso db create basketball-league
   turso db show basketball-league --url            # → libsql://...
   turso db tokens create basketball-league         # → auth token
   ```
2. **Apply migrations to Turso:**
   ```bash
   DATABASE_URL=<turso-url> DATABASE_AUTH_TOKEN=<turso-token> npx drizzle-kit migrate
   ```
   (Optionally seed once: `DATABASE_URL=... DATABASE_AUTH_TOKEN=... npm run db:seed`.)
3. **Provision Agora project:** create at https://console.agora.io, enable App Certificate, copy App ID + Primary Certificate.
4. **Configure Vercel env vars** (production scope):
   - `DATABASE_URL` — Turso libsql:// URL
   - `DATABASE_AUTH_TOKEN` — Turso auth token
   - `JWT_SECRET` — 64-hex secret (different from local)
   - `AGORA_APP_ID`
   - `AGORA_APP_CERTIFICATE`
   - `NEXT_PUBLIC_AGORA_APP_ID` — same as AGORA_APP_ID, exposed to browser
5. **Deploy:**
   ```bash
   vercel link
   vercel --prod
   ```

## Architecture notes

- Authenticated routes live under `(app)` route group; unauthenticated public routes under `(public)`. `middleware.ts` redirects unauthenticated users hitting protected paths.
- Standings derived from match results on each request (no cache).
- Auto-matchmaking generates a Berger-table round-robin per division per season.
- Live stream: admin and the team managers of either team for a match get publisher tokens; everyone else gets subscriber tokens.

## Known caveats

- Built against Next 16 (Turbopack default). The plan was originally written against Next 15; minor API drift exists but the App Router conventions used here are stable.
- `middleware.ts` works in Next 16 but emits a deprecation notice in dev; future migration to `proxy.ts` is recommended.
- shadcn 3.x replaced toast → sonner; Button does not support `asChild`. Use `buttonVariants({...})` for link-styled buttons.
- The Agora SDK touches `window` at module load, so `StreamHost` and `StreamPlayer` use `await import("agora-rtc-sdk-ng")` lazy-loading.
