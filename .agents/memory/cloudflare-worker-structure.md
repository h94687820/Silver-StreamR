---
name: Cloudflare Worker structure
description: Architecture decisions for the Hono-based Cloudflare Worker API (cloudflare/worker/).
---

## Location
`cloudflare/worker/` — self-contained, NOT part of the pnpm workspace (has its own package.json + npm install).

## Key decisions

- **Framework:** Hono (not Express) — Workers-compatible, no Node.js deps.
- **DB driver:** `drizzle-orm/d1` + Cloudflare D1 binding (`c.env.DB: D1Database`). Schema uses `drizzle-orm/sqlite-core` (NOT pg-core). DB created per-request via `createDb(c.env.DB)`.
- **Auth:** `@clerk/backend` `verifyToken()` — reads `Authorization: Bearer <token>`, returns Clerk `sub` (= user primary key). NOT `@clerk/express`.
- **Storage:** Cloudflare R2 native binding (`c.env.STORAGE: R2Bucket`). `uploadFile(bucket, publicUrl, body, contentType)` / `deleteFile(bucket, publicUrl, fileUrl)`. NO aws4fetch.
- **Schema:** `cloudflare/worker/src/schema/` — all 13 tables use `sqliteTable` from sqlite-core. Arrays (mediaUrls, hashtags) stored as `text({ mode: 'json' }).$type<string[]>()`. Booleans as `integer({ mode: 'boolean' })`. Timestamps as `integer({ mode: 'timestamp_ms' }).$defaultFn(() => new Date())`.
- **DB type:** Use `DrizzleD1Database<typeof schema>` (imported from `drizzle-orm/d1`).
- **tsconfig:** `noImplicitAny: false` — map callback args in route files are untyped but safe; strict is otherwise on.

## Auth middleware pattern
Global `app.use('/api/*', ...)` verifies Clerk JWT and calls `c.set('clerkId', clerkId)`.  
Public paths `/api/healthz` and `/api/users/check-username` skip auth via early-return.

## Onboarding pattern
No global middleware for onboarding — each route calls `requireOnboarding(db, clerkId)` inline (a local helper that calls `getOrCreateUser` and checks `.onboardingComplete`). Returns `403 { error, onboardingRequired: true }` if not complete.

## Bindings (wrangler.toml)
- `[[d1_databases]]` binding = "DB", database_name = "silver-stream-db" (create via `wrangler d1 create`)
- `[[r2_buckets]]` binding = "STORAGE", bucket_name = "silver-stream-storage" (create via `wrangler r2 bucket create`)
- `[vars]` STORAGE_PUBLIC_URL = R2 public URL (enable Public Access on bucket first)

## Secrets (set via `wrangler secret put`)
CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY

## Frontend integration
`artifacts/silver-stream/src/main.tsx` calls `setBaseUrl(import.meta.env.VITE_API_URL)` if that env var is set. For local dev (same-origin), leave it empty.

**Why:** Workers-compatible clients cannot use Node.js TCP sockets; HTTP/WS transport is required for both DB and storage.
