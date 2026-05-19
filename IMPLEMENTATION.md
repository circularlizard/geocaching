# Implementation Approach: QR Code Geocaching Tracker

## 1. Overall Strategy

Implementation uses a **test-driven agentic development loop**:

1. Gherkin feature files are authored from the PRD before any application code is written.
2. An agentic coding session (e.g. Windsurf/Cascade or equivalent) implements code incrementally by phase.
3. Each phase ends when all tests for that phase pass.
4. Phases are ordered to build on each other — no phase requires functionality from a later phase.

The exit condition for the full implementation is: **all Gherkin scenarios pass, both at integration level (Vitest) and E2E level (Playwright).**

---

## 2. Implementation Phases

> **Status key:** ✅ Complete | 🚧 In Progress | ⬜ Not Started

| Phase | Status | Git Commit |
|---|---|---|
| 0 — Scaffold & Local Environment | ✅ Complete | `4b83c6e` |
| Gherkin feature files (all phases) | ✅ Committed | `094da11` |
| 1 — Token Routing `/scan` | ✅ Complete | `d45bd0d` |
| 2 — Team Registration | ✅ Complete | `7d0a4b9` |
| 3 — Active Clue Page | ✅ Complete | `7bc578c` |
| 4 — Cache Found Flow | ✅ Complete | `d481c26` |
| 5 — Skip Cache Flow | ✅ Complete | `389d994` |
| 6 — Game Completion | ✅ Complete | `4d0098c` |
| 7 — Admin Setup | ✅ Complete | `e9bda7a` |
| 8 — Admin Dashboard | ✅ Complete | `b6bbc3a` |
| 9 — UI Polish & NFR | ✅ Complete | `9a9aefb` |

---

### Phase 0: Project Scaffold & Local Environment

**Goal:** A running Next.js app with database connectivity, local services, and a passing test harness — no game logic yet.

- Initialise Next.js (App Router) project.
- Set up `docker-compose.yml` with Postgres and MinIO services.
- Configure Drizzle ORM (or Prisma) with schema matching the PRD data model.
- Write and run database migration.
- Write a seed script that creates a known test fixture: 1 game, 8 caches, 3 registration tokens, pre-assigned sequences.
- Install and configure Vitest + `@cucumber/cucumber` integration.
- Install and configure Playwright.
- Verify: `docker compose up`, `npm run db:migrate`, `npm run db:seed`, `npm test`, `npm run test:e2e` all succeed (with 0 feature files, 0 tests — clean baseline).

**Acceptance:** CI-equivalent command sequence runs end to end without error on a fresh clone.

---

### Phase 1: Token Routing — `/scan` Endpoint

**Goal:** The single entry point for all QR code scans correctly identifies the token type and routes accordingly.

- Implement `GET /scan?id=[token]` route.
- If token is an unregistered Registration Token in the active game → redirect to `/register?token=[token]`.
- If token is a registered Registration Token in the active game → redirect to `/clue/[teamId]`.
- If token is a Cache Location Token → redirect to `/found/[cacheToken]` (stub page for now).
- If token is unknown → render error page.
- If game end time has passed or admin recall is active → render game-over page.

**Gherkin feature:** `scan-routing.feature`

---

### Phase 2: Team Registration

**Goal:** A team can register against a Registration Token and be assigned a randomised cache sequence.

- Implement `GET /register?token=[token]` — renders registration form.
- Implement `POST /api/register` — validates team name (required) and members (4–8), creates Team record, generates and stores a randomised cache sequence, redirects to `/clue/[teamId]`.
- Re-scanning a registered token redirects directly to `/clue/[teamId]` (no form shown).
- Sequence generation: random permutation of all caches in the game, unique per team.

**Gherkin feature:** `registration.feature`

---

### Phase 3: Active Clue Page

**Goal:** A registered team can view their current clue and request additional clues.

- Implement `GET /clue/[teamId]` — displays team name, current score, and Clue 1 text for the current cache.
- "Request next clue" button reveals Clue 2 (records `clue2_requested_at` timestamp).
- "Request next clue" again reveals Clue 3 text and image (records `clue3_requested_at` timestamp).
- Once Clue 3 is visible, a "Cannot find cache" button appears.
- Clue progression is one-way — cannot go back.
- Current Cache Index in the Team record determines which cache is active.

**Gherkin feature:** `clue-page.feature`

---

### Phase 4: Cache Found Flow

**Goal:** Scanning a cache QR code records the find, prompts confirmation, and advances the team.

- Implement `GET /found/[cacheToken]` — validates token against the team's current expected cache.
- Records `found_at` timestamp immediately on scan.
- Renders a confirmation page: "You found it! Please replace the cache box. Confirm when done."
- On confirmation (`POST /api/confirm-found`): calculates points (based on clues requested so far), updates Progress Log, advances `current_cache_index`.
- If this was the last cache: redirects to `/complete/[teamId]`.
- Otherwise: redirects to `/clue/[teamId]` (now showing Clue 1 for next cache).
- Scanning a cache that is not the team's current expected cache renders an error ("This is not your next cache").

**Gherkin feature:** `cache-found.feature`

---

### Phase 5: Skip Cache Flow

**Goal:** After requesting all three clues, a team can declare they cannot find the cache.

- "Cannot find cache" button on clue page (only visible after Clue 3 requested).
- Clicking shows "Are you sure?" confirmation prompt.
- On confirm: records 0 points for cache, sets `skipped = true` in Progress Log, advances `current_cache_index`, redirects to `/clue/[teamId]`.

**Gherkin feature:** `skip-cache.feature`

---

### Phase 6: Game Completion

**Goal:** After the final cache, a team sees a completion message. Game end time is enforced.

- After confirming the final cache found (or skipping it): render `/complete/[teamId]` with congratulatory message and final score.
- Any scan (Registration or Cache) after the global Game End Time renders the game-over page.
- Admin Recall flag also triggers game-over page on next scan or clue page load.

**Gherkin feature:** `game-completion.feature`

---

### Phase 7: Admin Interface — Game & Cache Setup

**Goal:** An admin can create a game, manage caches, and generate QR codes.

- Password-protected admin section (`/admin`) — password checked against `ADMIN_PASSWORD` env var via a simple session cookie.
- Create/edit Game: name, end time, cache count.
- Create/edit Caches: name, Clue 1 text, Clue 2 text, Clue 3 text, Clue 3 image upload (to MinIO locally / Vercel Blob in production).
- Generate Registration Token QR codes: downloadable as a print sheet (PNG or PDF).
- Assign caches to the active game.
- View existing Registration Tokens (generated once, reused across games).

**Gherkin feature:** `admin-setup.feature`

---

### Phase 8: Admin Monitoring Dashboard

**Goal:** Admin can monitor all teams in real time and trigger a recall.

- `GET /admin/dashboard` — lists all registered teams, their members, current cache index, score, and per-cache timestamps.
- Auto-refreshes at a reasonable interval (e.g. every 10 seconds via polling — no WebSocket required for this scale).
- "Recall All Teams" button sets `admin_recall_triggered = true` on the active Game, with confirmation prompt.

**Gherkin feature:** `admin-dashboard.feature`

---

### Phase 9: UI Polish & NFR Validation

**Goal:** Mobile UI is production-ready and NFRs are met.

- Responsive layout optimised for mobile (large tap targets, high-contrast text, legible in sunlight).
- Loading states and error states for all user-facing pages.
- Verify all page loads complete within 2 seconds against a seeded local database.
- Accessibility: sufficient colour contrast, legible font sizes.

**No new Gherkin scenarios** — this phase is verified by Playwright visual/performance checks and manual review.

**Implementation notes:**
- `src/app/layout.tsx` — added `viewport` export for mobile (device-width, no user-scalable), `antialiased` body class.
- `src/app/globals.css` — base mobile styles: `text-size-adjust`, min tap target sizing, legible font sizes.
- `src/app/page.tsx` — replaced boilerplate with a clean mobile-friendly landing page.
- `src/app/error.tsx` — global error boundary (client component).
- `src/app/not-found.tsx` — global 404 page.
- `src/app/clue/[teamId]/loading.tsx`, `found/[cacheToken]/loading.tsx`, `skip/[teamId]/loading.tsx`, `completion/[teamId]/loading.tsx` — Tailwind pulse skeleton loaders.
- `src/app/scan/route.ts` — **converted from page to Route Handler** to produce proper HTTP 307 redirects (Next.js App Router streaming encodes `redirect()` as RSC payload in dev mode; Route Handlers always return real HTTP responses).
- `src/app/register/route.ts` — same fix; renders form HTML inline for the non-redirect case.
- `playwright.config.ts` — added `mobile-chrome` project (Pixel 5 device).
- `tests/e2e/mobile-nfr.spec.ts` — Playwright checks: mobile viewport, page load time, minimum touch-target sizes.

---

## 3. Gherkin Feature File Index

| Feature File | Phase | Covers |
|---|---|---|
| `scan-routing.feature` | 1 | Token type detection, routing, game-over state |
| `registration.feature` | 2 | First scan registration, re-scan redirect, sequence assignment |
| `clue-page.feature` | 3 | Clue progression, display of team name/score |
| `cache-found.feature` | 4 | Scan-to-confirm flow, scoring, cache advancement |
| `skip-cache.feature` | 5 | Skip flow, 0 points, advancement |
| `game-completion.feature` | 6 | Final cache, completion page, game-over enforcement |
| `admin-setup.feature` | 7 | Game creation, cache management, QR generation |
| `admin-dashboard.feature` | 8 | Team monitoring, recall trigger |

---

## 4. File Structure (Proposed)

```
/
├── app/                        # Next.js App Router pages and API routes
│   ├── scan/
│   ├── register/
│   ├── clue/[teamId]/
│   ├── found/[cacheToken]/
│   ├── complete/[teamId]/
│   └── admin/
├── lib/
│   ├── db/                     # Drizzle schema, migrations, seed script
│   └── storage/                # Abstracted blob storage module (Vercel Blob / MinIO)
├── features/                   # Gherkin .feature files
├── tests/
│   ├── step-definitions/       # Vitest/Cucumber step definitions
│   └── e2e/                    # Playwright specs
├── docker-compose.yml
├── .env.local.example
└── PRD.md
```

---

## 5. Environment Variables

| Variable | Description | Local Value |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | `postgresql://postgres:postgres@localhost:5432/geocache` |
| `STORAGE_PROVIDER` | `vercel-blob` or `minio` | `minio` |
| `MINIO_ENDPOINT` | MinIO endpoint | `http://localhost:9000` |
| `MINIO_ACCESS_KEY` | MinIO access key | `minioadmin` |
| `MINIO_SECRET_KEY` | MinIO secret key | `minioadmin` |
| `MINIO_BUCKET` | Bucket name | `geocache` |
| `ADMIN_PASSWORD` | Admin interface password | set in `.env.local` |
| `NEXT_PUBLIC_APP_URL` | Base URL for QR code generation | `http://localhost:3000` |

---

## 6. Agentic Implementation Notes

- Each phase should be implemented and tested **independently before moving to the next**.
- The agent should run `npm test` after each phase and not proceed until all tests pass.
- The seed script is the source of truth for test data — the agent must not hardcode IDs or tokens in tests.
- Database migrations must be additive — no destructive schema changes after Phase 0.
- The agent must not modify existing passing Gherkin scenarios to make new ones pass.
- **Git commits:** The agent must commit at the end of each phase (all tests passing) with a message in the format `phase(N): <short description>` (e.g. `phase(2): team registration and sequence assignment`). The agent must also commit the Gherkin feature files for a phase **before** writing any implementation code for that phase, so the test-first intent is preserved in the git history. No commits should be made mid-phase with failing tests unless explicitly labelled `wip:`.

