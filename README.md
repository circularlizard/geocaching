# QR Code Geocaching Tracker

A mobile-first web application for running live geocaching games with QR codes. Teams scan QR codes to navigate between physical cache locations, receive progressive clues, and accumulate points based on how few clues they needed.

## How it works

1. **Game day setup** — the admin creates a game, configures 8 cache locations with 3-tier clues (text + optional photo), and prints QR code sheets for registration and each cache box.
2. **Team registration** — each team scans their unique registration QR code, enters a team name and member names, and receives their first clue.
3. **Playing the game** — teams navigate to cache locations, scan the cache QR code to log a find, confirm they've replaced the box, and are then shown the clue for their next location. Each team's cache sequence is randomised so teams can't follow each other.
4. **Scoring** — 5 points for finding a cache on the first clue, 3 on the second, 1 on the third, 0 if skipped. The admin dashboard shows live team progress and can trigger a game-over recall at any time.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL via Drizzle ORM |
| Image storage | MinIO (local) / Vercel Blob (production) |
| Styling | Tailwind CSS |
| BDD tests | Cucumber / Gherkin |
| E2E tests | Playwright |
| Local services | Docker Compose |

---

## Running locally

### Prerequisites

- Node.js 20+
- Docker Desktop (for local Postgres and MinIO)

### 1. Clone and install

```bash
git clone <repo-url>
cd BoreStaneGeoCache
npm install
```

### 2. Start backing services

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on `localhost:5432` (database: `geocache`, user/password: `postgres`)
- **MinIO** on `localhost:9000` (API) and `localhost:9001` (web console)  
  Credentials: `minioadmin` / `minioadmin`

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and set `ADMIN_PASSWORD` to something you'll remember. The other values work as-is for the Docker setup.

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/geocache
STORAGE_PROVIDER=minio
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=geocache
ADMIN_PASSWORD=your-password-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run database migrations

```bash
npm run db:migrate
```

### 5. (Optional) Seed test data

```bash
  npm run db:seed
```

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The admin interface is at [http://localhost:3000/admin](http://localhost:3000/admin).

---

## Running tests

All tests require Docker services to be running and the database to be migrated.

### Cucumber / Gherkin (BDD integration tests)

These tests run directly against the database and a running Next.js dev server:

```bash
# In one terminal — keep this running
npm run dev

# In another terminal
npm run test:cucumber
```

### Playwright (E2E tests)

```bash
npm run test:e2e
```

Playwright runs against `http://localhost:3000` by default. To test against a Vercel preview URL:

```bash
TEST_BASE_URL=https://your-preview.vercel.app npx playwright test
```

### Vitest (unit tests)

```bash
npm run test:run
```

---

## Deploying to Vercel

### Database — Neon (Vercel Postgres)

1. In the [Vercel dashboard](https://vercel.com), go to **Storage → Create Database → Neon**.
2. Link it to your project. Vercel will automatically set `DATABASE_URL` (and `POSTGRES_URL`) in the project's environment variables.

### Image storage — Vercel Blob

1. In the Vercel dashboard, go to **Storage → Create Database → Blob**.
2. Link it to your project. Vercel will set `BLOB_READ_WRITE_TOKEN` automatically.

### Deploy

```bash
# Install the Vercel CLI if you haven't already
npm i -g vercel

vercel
```

Or push to a connected GitHub repository to trigger an automatic deployment.

### Environment variables to set in Vercel

Go to **Project → Settings → Environment Variables** and add:

| Variable | Value |
|---|---|
| `STORAGE_PROVIDER` | `vercel-blob` |
| `ADMIN_PASSWORD` | A strong password of your choice |
| `NEXT_PUBLIC_APP_URL` | Your production URL, e.g. `https://your-app.vercel.app` |

> `DATABASE_URL` is set automatically by the Neon integration. `BLOB_READ_WRITE_TOKEN` is set automatically by the Blob integration.

### Run migrations on Neon

After the first deploy, run migrations against the production database:

```bash
# Set the Neon connection string locally (from Vercel dashboard → Storage → your Neon db → .env.local tab)
DATABASE_URL=<neon-connection-string> npm run db:migrate
```

### QR code base URL

Set `NEXT_PUBLIC_APP_URL` to your production domain so generated QR codes encode the correct URLs (e.g. `https://your-app.vercel.app`).

---

## Admin interface

Navigate to `/admin` and log in with `ADMIN_PASSWORD`.

From the dashboard you can:

- Create a game (name, end time, cache count)
- Add cache locations with 3-tier clue text and an optional Clue 3 photograph
- Assign caches to the active game
- Generate and download QR code sheets for registration cards and cache boxes
- Monitor all teams in real time (members, cache progress, timestamps, score)
- Trigger a "Recall All Teams" game-over broadcast

---

## Project structure

```
src/
├── app/
│   ├── scan/            # QR code entry point — Route Handler, redirects by token type
│   ├── register/        # Team registration — Route Handler, renders form or redirects
│   ├── clue/[teamId]/   # Active clue page
│   ├── found/[cacheToken]/  # Cache found confirmation
│   ├── skip/[teamId]/   # Skip cache confirmation
│   ├── completion/[teamId]/ # Game completion page
│   └── admin/           # Password-protected admin area
├── components/          # Shared React components
└── lib/
    └── db/              # Drizzle schema, migrations, seed script
features/                # Gherkin .feature files (BDD specs)
tests/
├── step-definitions/    # Cucumber step implementations
├── support/             # Test world and hooks
└── e2e/                 # Playwright specs
docker-compose.yml
```
