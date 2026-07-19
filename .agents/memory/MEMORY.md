# Memory Index

- [Express+TS middleware param typing](express-middleware-param-typing.md) — chained middleware typed as plain `Request` forces route params to `string|string[]` project-wide.
- [Generated API client hook conventions](api-client-react-hooks.md) — orval-generated hooks: no-param endpoints take options as arg 0 (not `undefined, options`); check actual return type before assuming `.items`.
- [Clerk + wouter routing bridge](clerk-wouter-routing-bridge.md) — Clerk's routerPush/routerReplace must call wouter's setLocation, not raw history.pushState, or nav appears "stuck" until refresh.
- [Object storage secrets present but bucket unprovisioned](object-storage-secrets-vs-provisioned.md) — env var names existing doesn't mean `setupObjectStorage()` ever ran; check for empty values, not just key presence. Bucket provisioned: replit-objstore-4c42f113-a21b-496b-88fc-800668e17e3a.
- [api-zod barrel export collision](api-zod-barrel-export-collision.md) — never `export *` generated/types in lib/api-zod/src/index.ts; orval params types collide with same-named zod schema values (TS2308).
- [Cloudflare Worker structure](cloudflare-worker-structure.md) — Hono API Worker lives in cloudflare/worker/; uses neon-http DB, Clerk verifyToken, aws4fetch for S3.
- [Cloudflare Pages + Clerk proxy](cloudflare-pages-clerk-proxy.md) — Proxy must be a Pages Function (same domain), not a cross-origin Worker; Worker secrets drift from Replit secrets.
- [Clerk routerPush cross-origin redirect](clerk-routerpush-external-url.md) — With proxyUrl set, Clerk passes full http URLs to routerPush; wouter's setLocation throws SecurityError → sign-in blanks out. Fix: detect http/https and use window.location instead.
- [Clerk v6 + Cloudflare Pages login fix](clerk-v6-cloudflare-login.md) — Three-layer bug: routerPush reload + SW, stale Clerk keys, proxy breaks Clerk v6 dev browser. Full diagnosis in login-fix.md.
- [Clerk instance drift → uploads/posts fail](clerk-instance-drift.md) — When Clerk instance changes, Worker CLERK_SECRET_KEY + CLERK_FAPI must be updated or all mutating API calls return 401.
- [Cloudflare deploy permanent fixes](cloudflare-deploy-permanent-fixes.md) — Two recurring bugs (login blank screen + photo upload fail); fixed via scripts/deploy.sh (`pnpm run deploy`). Never deploy manually.
