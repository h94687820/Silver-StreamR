---
name: Cloudflare Worker structure
description: Architecture decisions for the Hono-based Cloudflare Worker API (cloudflare/worker/).
---

## Location
`cloudflare/worker/` — self-contained, NOT part of the pnpm workspace (has its own package.json + npm install).

## Key decisions

- **Framework:** Hono (not Express) — Workers-compatible, no Node.js deps.
- **DB driver:** `@neondatabase/serverless` + `drizzle-orm/neon-http` — works with any PostgreSQL over HTTP/WebSocket. DB is created per-request via `createDb(c.env.DATABASE_URL)`.
- **Auth:** `@clerk/backend` `verifyToken()` — reads `Authorization: Bearer <token>`, returns Clerk `sub` (= user primary key). NOT `@clerk/express`.
- **Storage:** `aws4fetch` (AwsClient) — lightweight S3-compatible client, no Node.js crypto dep. Configured via `STORAGE_ENDPOINT / BUCKET / ACCESS_KEY / SECRET_KEY / REGION / PUBLIC_URL`.
- **Schema:** Copied into `cloudflare/worker/src/schema/` — stripped of drizzle-zod imports so Worker doesn't need those packages. Schema is the source of truth for Worker DB shape.
- **DB type:** Use `NeonHttpDatabase<typeof schema>` (imported from `drizzle-orm/neon-http`) NOT `ReturnType<typeof createDb>` — the latter causes a circular type reference.
- **tsconfig:** `noImplicitAny: false` — map callback args in route files are untyped but safe; strict is otherwise on.

## Auth middleware pattern
Global `app.use('/api/*', ...)` verifies Clerk JWT and calls `c.set('clerkId', clerkId)`.  
Public paths `/api/healthz` and `/api/users/check-username` skip auth via early-return.

## Onboarding pattern
No global middleware for onboarding — each route calls `requireOnboarding(db, clerkId)` inline (a local helper that calls `getOrCreateUser` and checks `.onboardingComplete`). Returns `403 { error, onboardingRequired: true }` if not complete.

## Secrets (set via `wrangler secret put`)
DATABASE_URL, CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY, STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY, STORAGE_REGION, STORAGE_PUBLIC_URL

## Frontend integration
`artifacts/silver-stream/src/main.tsx` calls `setBaseUrl(import.meta.env.VITE_API_URL)` if that env var is set. For local dev (same-origin), leave it empty.

**Why:** Workers-compatible clients cannot use Node.js TCP sockets; HTTP/WS transport is required for both DB and storage.
