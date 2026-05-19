# Vercel Deployment Guide

## Prerequisites

- Vercel project linked to the GitHub repo
- Vercel Postgres database created and connected to the project
- Vercel Blob storage created and connected to the project
- Vercel CLI installed: `npm i -g vercel`

---

## 1. Environment Variables in Vercel

Go to **Project → Settings → Environment Variables** and add the following.

### Auto-created by Vercel (verify they exist)

When you connect a Vercel Postgres database and Blob storage, Vercel automatically injects these — check they are present:

| Variable | Source |
|---|---|
| `POSTGRES_URL` | Vercel Postgres (pooled, PgBouncer) |
| `POSTGRES_URL_NON_POOLING` | Vercel Postgres (direct connection) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob |

The app's database client resolves credentials in this order, so **no manual `DATABASE_URL` is needed** as long as these are present:
```
DATABASE_URL  →  POSTGRES_URL_NON_POOLING  →  POSTGRES_URL
```

### Manually add these

| Variable | Value | Env |
|---|---|---|
| `ADMIN_PASSWORD` | your chosen admin password | Production, Preview |
| `NEXT_PUBLIC_APP_URL` | `https://your-project.vercel.app` | Production |
| `NEXT_PUBLIC_APP_URL` | `https://your-branch.vercel.app` (or leave unset to use localhost) | Preview |

> `NEXT_PUBLIC_APP_URL` is used to generate QR code URLs. Get the exact domain from **Vercel → Domains**.

---

## 2. Run Database Migrations

The schema must be pushed to Vercel Postgres before the app is usable. Do this once after initial deploy and again whenever the schema changes.

### Option A — push from local machine (recommended)

Pull the Vercel env vars locally (see section 3), then:

```bash
npx drizzle-kit push
```

`drizzle.config.ts` reads `DATABASE_URL` from `.env.local`, which after a `vercel env pull` will be the Vercel Postgres non-pooling URL.

If `DATABASE_URL` isn't in the pulled vars, set it explicitly for the push:

```bash
DATABASE_URL="<POSTGRES_URL_NON_POOLING value>" npx drizzle-kit push
```

### Option B — add to build command

In **Project → Settings → General → Build & Development Settings**, change the build command to:

```
npx drizzle-kit push && next build
```

This runs the schema push on every Vercel deploy (idempotent — safe to run repeatedly).

---

## 3. Connecting Locally to Vercel Services

You can point your local dev server at the live Vercel Postgres and Blob to test production-like conditions (e.g. verifying Blob uploads work).

```bash
# Link this directory to your Vercel project (one-time)
vercel link

# Pull all production environment variables into .env.local
vercel env pull .env.local
```

This overwrites `.env.local` with the real Vercel values for `DATABASE_URL` / `POSTGRES_URL`, `BLOB_READ_WRITE_TOKEN`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_APP_URL`, etc.

Then run normally:

```bash
npm run dev
```

The local Next.js app will now connect to Vercel Postgres and Vercel Blob instead of the Docker containers.

> **Warning:** This uses the same database as your live deployment. Any seed scripts or test data operations will affect production data. Restore your local Docker config when done:
>
> ```bash
> cp .env.local.example .env.local
> # then edit with your local values
> ```

### When to use Vercel services locally

| Task | Use |
|---|---|
| Testing Blob image uploads end-to-end | Vercel env (`vercel env pull`) |
| Running Cucumber tests | Local Docker (default `.env.local`) |
| Normal day-to-day development | Local Docker (default `.env.local`) |
| Verifying migrations before deploy | Vercel env (`vercel env pull`) |

---

## 4. Vercel Postgres: Pooled vs Non-Pooling URLs

Vercel Postgres provides two connection URLs:

| URL | Use |
|---|---|
| `POSTGRES_URL` | Pooled (PgBouncer, transaction mode) — for the running app |
| `POSTGRES_URL_NON_POOLING` | Direct connection — required for `drizzle-kit push` and schema migrations |

The `postgres` client in `src/lib/db/index.ts` already has `prepare: false`, which is required for PgBouncer transaction mode. Both URLs work at runtime.

---

## 5. Deploy Checklist

- [ ] Vercel Postgres connected → `POSTGRES_URL` and `POSTGRES_URL_NON_POOLING` visible in env vars
- [ ] Vercel Blob connected → `BLOB_READ_WRITE_TOKEN` visible in env vars
- [ ] `ADMIN_PASSWORD` set
- [ ] `NEXT_PUBLIC_APP_URL` set to the correct domain
- [ ] Schema pushed: `npx drizzle-kit push` (using Vercel Postgres URL)
- [ ] First deploy triggered (push to main or manual deploy in Vercel dashboard)
- [ ] Visit `https://your-project.vercel.app/admin/login` and verify login works
