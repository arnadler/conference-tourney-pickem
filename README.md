# Conference Tournament Pick'Em

A web app for picking winners in college basketball conference tournaments (ACC, SEC, Big Ten, Big East, etc.). Users make picks on interactive brackets, picks lock at tournament tip-off, and scoring is automatic.

## Features

- **Multiple tournament brackets** in one site (SEC, Big East, ACC, Big 12, etc.)
- **Interactive bracket UI** — click to pick winners, auto-advance to next round
- **Pick locking** — picks lock at tournament's first game start time (server-enforced)
- **Auto-scoring** — admin enters results, picks are scored automatically
- **Standings** — per-tournament and overall leaderboards
- **Admin dashboard** — import tournaments via JSON, enter results game-by-game
- **Auth** — credentials login for dev, magic link email for production

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **SQLite** via Prisma + better-sqlite3 (easy local dev; swap to Postgres for production)
- **NextAuth v5** (Auth.js)
- **Tailwind CSS**

## Quick Start

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run migrations (creates SQLite DB)
npm run db:migrate

# Seed sample data (2 tournaments + 5 test users with picks)
npm run db:seed

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Login

In dev mode, use the **Credentials** login (any email creates/logs in instantly):

- **Admin:** `admin@example.com`
- **Test users:** `alice@example.com`, `bob@example.com`, `charlie@example.com`, `diana@example.com`, `eve@example.com`

## Creating an Admin User

The seed script creates `admin@example.com` as an admin. To make any other user an admin:

```bash
# Using sqlite3 directly:
sqlite3 dev.db "UPDATE User SET isAdmin = 1 WHERE email = 'someone@example.com';"
```

Or use Prisma Studio:
```bash
npx prisma studio
```

## Tournament JSON Import Schema

Tournaments are imported via JSON. Here's the schema:

```json
{
  "conferenceName": "SEC",
  "year": 2026,
  "timezone": "America/New_York",
  "firstGameStart": "2026-03-11T12:00:00-05:00",
  "teams": [
    { "seed": 1, "name": "Auburn" },
    { "seed": 2, "name": "Tennessee" }
  ],
  "games": [
    {
      "gameNumber": 1,
      "round": 1,
      "position": 0,
      "startTime": "2026-03-11T12:00:00-05:00",
      "topTeamName": "Auburn",
      "bottomTeamName": "Vanderbilt",
      "topSeedLabel": "#1 Auburn",
      "bottomSeedLabel": "#16 Vanderbilt",
      "topSourceGameNumber": null,
      "bottomSourceGameNumber": null,
      "nextGameNumber": 9,
      "nextSlot": "top",
      "isBye": false
    }
  ]
}
```

### Key concepts

- **First-round games**: Set `topTeamName` and `bottomTeamName` directly
- **Later-round games**: Set `topSourceGameNumber` / `bottomSourceGameNumber` to reference which game feeds each slot
- **Bye games**: Set `isBye: true` with the advancing team in `topTeamName`
- **Bracket wiring**: Use `nextGameNumber` + `nextSlot` to connect games forward

### Sample files

- `prisma/sample-data/sec-2026.json` — SEC tournament (16 teams, 4 rounds, with byes)
- `prisma/sample-data/big-east-2026.json` — Big East tournament (11 teams, 4 rounds, with byes)

## Admin Workflow

1. Go to `/admin` (sign in as admin)
2. Click **Import Tournament** — paste JSON or upload `.json` file
3. After games are played, go to **Manage / Enter Results** for a tournament
4. Click the winning team for each game — results are saved immediately and picks auto-scored

## Scoring

**MVP scoring:** 1 point per correct pick, regardless of round.

The system is designed to support future scoring models (points per round, seed upset bonuses) — the `round` field is available on every game for weighted scoring.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                      # Home — tournament list
│   ├── login/page.tsx                # Login page
│   ├── (main)/
│   │   ├── tournaments/[id]/         # Tournament bracket page
│   │   ├── standings/                # Overall standings
│   │   ├── standings/[tournamentId]/ # Per-tournament standings
│   │   ├── my-picks/                 # User's picks across tournaments
│   │   └── user/[userId]/            # View any user's picks
│   ├── admin/
│   │   ├── page.tsx                  # Admin dashboard
│   │   ├── import/                   # Tournament JSON import
│   │   └── tournaments/[id]/         # Enter results
│   └── api/
│       ├── auth/[...nextauth]/       # NextAuth routes
│       ├── picks/                    # Save/load picks
│       └── admin/                    # Admin API (results, tournaments)
├── components/
│   ├── Bracket.tsx                   # Interactive bracket component
│   ├── LockCountdown.tsx             # Lock timer/status
│   ├── Navbar.tsx                    # Navigation
│   └── Providers.tsx                 # Session provider
├── lib/
│   ├── auth.ts                       # NextAuth config
│   ├── bracket-utils.ts              # Bracket validation logic
│   ├── db.ts                         # Prisma client
│   ├── scoring.ts                    # Score calculation
│   ├── tournament-import.ts          # JSON import logic
│   └── validators.ts                 # Zod schemas
└── __tests__/                        # Unit + integration tests
```

## Running Tests

```bash
npm test            # Run all tests
npm run test:watch  # Watch mode
```

## Switching to Postgres (Production)

1. Update `prisma/schema.prisma`: change `provider = "sqlite"` to `provider = "postgresql"`
2. Update `src/lib/db.ts`: swap `PrismaBetterSqlite3` for `PrismaPg` from `@prisma/adapter-pg`
3. Set `DATABASE_URL` to your Postgres connection string
4. Run `npx prisma migrate dev`

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed sample data |
| `npm run db:reset` | Reset DB + re-seed |
| `npm test` | Run tests |
| `npm run lint` | Run ESLint |
