---
name: Cloudflare Pages + Clerk Proxy
description: How to proxy Clerk FAPI correctly when deploying to Cloudflare Pages with a separate Cloudflare Worker backend.
---

## Rule
Clerk FAPI proxy MUST run on the SAME domain as the frontend. Using a cross-origin Worker as proxy causes dev-browser cookie failures — modern browsers block third-party cookies.

## Solution
Use a **Cloudflare Pages Function** (`functions/api/__clerk/[[path]].ts`) instead of routing through the Worker.
- Function runs on `silver-stream.pages.dev/api/__clerk/*` — same origin
- `VITE_CLERK_PROXY_URL` = `https://silver-stream.pages.dev/api/__clerk`
- Pages Function env vars (`CLERK_SECRET_KEY`, `CLERK_FAPI`) set via Cloudflare API on the Pages project

## Worker secrets must match frontend keys
Worker `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY` can drift from the Replit secrets.
Update them explicitly: `echo "$CLERK_SECRET_KEY" | wrangler secret put CLERK_SECRET_KEY`

**Why:** Worker secrets are set manually via wrangler and don't auto-sync with Replit secrets. If the Clerk instance is rotated in Replit, the Worker still has the old key → token verification fails with 401.

## CLERK_FAPI env var
Hardcode `CLERK_FAPI = "https://vital-fox-43.clerk.accounts.dev"` in wrangler.toml `[vars]` instead of deriving from the publishable key.
Dynamic derivation via `atob()` can fail silently (newline from echo, URL-safe base64) and fall back to `frontend-api.clerk.dev` which routes to the wrong instance.

## Tailwind v4 + Clerk in prod
Always set `tailwindcss({ optimize: false })` in vite.config.ts AND add `@layer theme, base, clerk, components, utilities;` before `@import 'tailwindcss'` in index.css.
Without this, CSS layer order is reordered in prod builds → Clerk UI invisible.

## Deploy workflow
```bash
PORT=3000 BASE_PATH="/" pnpm --filter @workspace/silver-stream run build
cp -r artifacts/silver-stream/functions artifacts/silver-stream/dist/public/functions
npx wrangler pages deploy artifacts/silver-stream/dist/public --project-name silver-stream --branch=main --commit-dirty=true
```

**Critical:** The `functions/` directory MUST be copied into `dist/public/` before deploying. Without this step, Pages Functions are not uploaded and all `/api/*` POST requests return 405 from Cloudflare's static file handler.
