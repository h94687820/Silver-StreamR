# Silver Stream — Cloudflare Deployment Guide

## Architecture

```
Frontend  →  Cloudflare Pages   (static Vite build)
API       →  Cloudflare Workers (Hono, cloudflare/worker/)
Database  →  Your PostgreSQL service (via HTTPS/WebSocket)
Storage   →  Your S3-compatible service
Auth      →  Clerk (JWT verification in Worker)
```

---

## Prerequisites

```bash
npm install -g wrangler
wrangler login
```

---

## 1 — Deploy the API Worker

### 1-a Install dependencies

```bash
cd cloudflare/worker
npm install
```

### 1-b Set secrets

Run each command and paste the value when prompted:

```bash
wrangler secret put DATABASE_URL          # postgres://user:pass@host/db
wrangler secret put CLERK_SECRET_KEY      # sk_live_...
wrangler secret put CLERK_PUBLISHABLE_KEY # pk_live_...
wrangler secret put STORAGE_ENDPOINT     # https://s3.example.com
wrangler secret put STORAGE_BUCKET       # silver-stream
wrangler secret put STORAGE_ACCESS_KEY_ID
wrangler secret put STORAGE_SECRET_ACCESS_KEY
wrangler secret put STORAGE_REGION       # auto  (or us-east-1, etc.)
wrangler secret put STORAGE_PUBLIC_URL   # https://cdn.example.com
```

### 1-c Deploy

```bash
wrangler deploy
```

Note the Worker URL — it will look like:
`https://silver-stream-api.<your-subdomain>.workers.dev`

### 1-d (Optional) Custom domain

In the Cloudflare dashboard → Workers & Pages → your Worker → Settings → Domains & Routes,
add a custom route such as `api.yourdomain.com/*`.

---

## 2 — Deploy the Frontend (Cloudflare Pages)

### 2-a Build settings in Pages dashboard

| Setting | Value |
|---|---|
| Framework preset | **Vite** |
| Build command | `pnpm --filter @workspace/silver-stream run build` |
| Build output directory | `artifacts/silver-stream/dist` |
| Root directory | `/` (repo root) |

### 2-b Environment variables (Pages → Settings → Environment variables)

| Variable | Value |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_...` |
| `VITE_API_URL` | `https://silver-stream-api.<subdomain>.workers.dev` |

`VITE_API_URL` points the frontend at your Worker. If left empty, API calls fall back to the same origin (`/api/...`) which is fine for local dev.

---

## 3 — Database migrations

The Worker uses the same schema as the existing Express API. Run migrations against
your PostgreSQL service the same way you always have (e.g. `pnpm --filter @workspace/db db:push`),
pointing `DATABASE_URL` at your service.

---

## 4 — Local development

```bash
cd cloudflare/worker
cp .dev.vars.example .dev.vars   # fill in values
wrangler dev
```

Create `.dev.vars` (git-ignored):

```ini
DATABASE_URL=postgres://...
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
STORAGE_ENDPOINT=https://...
STORAGE_BUCKET=silver-stream
STORAGE_ACCESS_KEY_ID=...
STORAGE_SECRET_ACCESS_KEY=...
STORAGE_REGION=auto
STORAGE_PUBLIC_URL=https://...
```

The Worker will be available at `http://localhost:8787`.

---

## 5 — Troubleshooting

| Symptom | Fix |
|---|---|
| `401 Unauthorized` | Check `CLERK_SECRET_KEY` secret is set and matches the Clerk app |
| DB connection error | Ensure `DATABASE_URL` uses `https://` or `wss://` transport (not plain TCP); neon-serverless requires HTTP/WebSocket |
| Storage upload fails | Verify endpoint, bucket name, and credentials; check CORS policy on your bucket allows PUT from `workers.dev` |
| `onboardingRequired: true` loop | User exists in Clerk but not in DB — call `POST /api/users/me/complete-onboarding` |
