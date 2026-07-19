---
name: Cloudflare permanent deploy fixes
description: Two recurring Cloudflare deployment bugs and their permanent fix via scripts/deploy.sh
---

## Two recurring bugs fixed permanently

### Bug 1 — Blank screen after email entry (login)

**Root cause:** Clerk `routing="path"` requires wouter to match sub-paths like `/sign-in/factor-one`. The pattern `/*?` used in wouter v3 (which uses `regexparam`) is not valid — `?` is not a supported modifier on `*`. Sub-paths never matched → blank screen after email submission.

**Permanent fix:** Changed `<SignIn>` and `<SignUp>` to use `routing="hash"`. Clerk manages step state internally via URL hash, so wouter only needs to match `/sign-in` and `/sign-up` (no sub-paths). No more routing complexity.

**Why:** Any attempt to use `routing="path"` with wouter will require exact pattern knowledge of regexparam; hash routing eliminates the dependency entirely.

**How to apply:** In `App.tsx`, always use `routing="hash"` on `<SignIn>` and `<SignUp>` — no `path` prop needed.

---

### Bug 2 — Photo/file upload fails on Cloudflare Pages

**Root cause:** The Service Binding `API` in Cloudflare Pages project was pointing to `silver-stream-devportal` instead of `silver-stream-api`. The `_worker.js` routes all `/api/*` through `env.API` — wrong binding means uploads hit the wrong Worker and fail.

**Secondary cause:** Clerk keys (`VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_FAPI`, `CLERK_SECRET_KEY`) drift between Replit Secrets and Cloudflare Pages/Worker after a Clerk instance change → login breaks.

**Permanent fix:** `scripts/deploy.sh` — run with `pnpm run deploy`. Does atomically:
1. Computes CLERK_FAPI from current `VITE_CLERK_PUBLISHABLE_KEY`
2. PATCHes Cloudflare Pages: syncs Clerk env vars AND forces `API → silver-stream-api` binding
3. Pushes `CLERK_SECRET_KEY` to the Worker
4. Updates `CLERK_FAPI` in `wrangler.toml` and redeploys Worker
5. Builds frontend
6. Deploys to Cloudflare Pages

**Why:** Manual deploys (wrangler pages deploy alone) don't touch the Service Binding or Clerk keys — drift accumulates silently until something breaks.

**How to apply:** Always deploy via `pnpm run deploy` from the workspace root, never `wrangler pages deploy` directly.

---

## Diagnostic checks

```bash
# Is the Service Binding correct?
curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/silver-stream" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | \
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
    const s=JSON.parse(d).result?.deployment_configs?.production?.services;
    console.log('API →',s?.API?.service); // must be silver-stream-api
  })"

# Are Worker secrets present?
curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/silver-stream-api/secrets" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | \
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
    JSON.parse(d).result?.forEach(s=>console.log(s.name));
    // must include: FORGE_API_KEY, CLERK_SECRET_KEY
  })"
```
