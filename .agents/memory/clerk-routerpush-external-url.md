---
name: Clerk proxy never works with pk_test_ dev keys
description: Clerk's Frontend API proxy (proxyUrl / clerk-proxy-url header) silently breaks all auth when the publishable key is pk_test_... — only pk_live_ production instances with a dashboard-verified domain support it.
---

## The rule
**Never set `proxyUrl` on ClerkProvider when the publishable key is `pk_test_...`** (a Development instance). Leave it `undefined` — Clerk dev instances allow direct cross-origin connections from any origin automatically, so no proxy is needed.

## Why
Clerk's proxy feature requires a Production instance (`pk_live_...`) with the proxy domain explicitly verified in the Clerk Dashboard. With a dev key through any reverse proxy, Clerk's edge rejects every FAPI call with `host_invalid` (400) or `dev_browser_unauthenticated` (401). The page renders normally but auth UI goes blank — failure only shows in the network tab, not as a visible layout error.

**Diagnostic signal:** `curl https://<domain>/api/__clerk/v1/client` → if response is `{"code":"host_invalid"}` or `dev_browser_unauthenticated`, this is the cause.

**Check key type before any proxy work:** `grep -o "pk_[a-zA-Z0-9_]*" <bundled JS>` — if `pk_test_`, remove proxy entirely.

## How to Apply
```ts
// مفاتيح pk_test_ لا تدعم proxy مطلقاً
// dev instances تسمح بالاتصال المباشر من أي origin تلقائياً
const clerkProxyUrl = undefined; // دائماً undefined مع pk_test_
```

Also: always guard `routerPush`/`routerReplace` with an external-URL check so Clerk's cross-origin redirects (e.g. dev_browser flow) work via `window.location` not `history.pushState`:
```ts
routerPush: (to) => to.startsWith("http") ? (window.location.href = to) : setLocation(stripBase(to)),
routerReplace: (to) => to.startsWith("http") ? window.location.replace(to) : setLocation(stripBase(to), { replace: true }),
```
