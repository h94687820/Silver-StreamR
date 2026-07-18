---
name: Clerk instance drift → uploads/posts fail
description: When Clerk switches instances, Cloudflare Worker and Pages secrets are not auto-synced, causing 401 on all authenticated API calls.
---

# Clerk Instance Drift — Recurring Root Cause

## The Rule
When the Clerk instance changes (new `VITE_CLERK_PUBLISHABLE_KEY` in Replit), **three places** must be updated or all authenticated API calls (post creation, file upload, etc.) return 401:

1. **Cloudflare Worker secret** `CLERK_SECRET_KEY` — via Cloudflare API PUT `/workers/scripts/<name>/secrets`
2. **Cloudflare Worker plain var** `CLERK_FAPI` — update `wrangler.toml` and redeploy the worker
3. **Cloudflare Pages env vars** — `CLERK_FAPI`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` — via Cloudflare API PATCH `/pages/projects/silver-stream`

Also **remove** `VITE_CLERK_PROXY_URL` from Pages if present — it breaks Clerk v6 dev instance auth.

**Why:** `VITE_CLERK_PUBLISHABLE_KEY` is baked into the JS bundle at Replit build time. The Worker verifies Bearer tokens using its own `CLERK_SECRET_KEY`. If the instance mismatches, `verifyToken` rejects every JWT → 401 on POST /posts, POST /storage/uploads, etc.

**How to apply:** Whenever uploads or post creation start failing with no code change, first check:
```bash
node -e "
const key = process.env.VITE_CLERK_PUBLISHABLE_KEY || '';
const enc = key.replace(/^pk_(test|live)_/, '');
const pad = enc + '='.repeat((4 - enc.length % 4) % 4);
console.log(Buffer.from(pad, 'base64').toString().replace(/\$+$/, ''));
"
```
Compare the decoded instance against `CLERK_FAPI` in `wrangler.toml` and Cloudflare Pages env vars.

## Fix Procedure (CodeExecution with CLOUDFLARE_API_TOKEN available)
1. Update Worker secret: `PUT /accounts/<id>/workers/scripts/silver-stream-api/secrets` with `{name: "CLERK_SECRET_KEY", text: process.env.CLERK_SECRET_KEY, type: "secret_text"}`
2. Update Pages env vars: `PATCH /accounts/<id>/pages/projects/silver-stream` with corrected `CLERK_FAPI`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`
3. Update `wrangler.toml` `CLERK_FAPI` and run `npx wrangler deploy` (needs CLOUDFLARE_API_TOKEN in env — write to /tmp script from CodeExecution, then ShellExec it)
4. Worker `PATCH /settings` for plain-text vars requires `multipart/form-data` — **redeploy is easier**.
