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

## routerPush same-origin fix (Cloudflare Pages blank screen during sign-up)

Always guard `routerPush`/`routerReplace` with a same-origin check FIRST, then cross-origin:

```ts
routerPush: (to) => {
  if (to.startsWith("http")) {
    try {
      const url = new URL(to);
      if (url.origin === window.location.origin) {
        // Same-origin absolute URL — use SPA navigation to avoid full page reload.
        // Full reloads on Cloudflare Pages (with service worker) break Clerk's
        // in-progress sign-up/sign-in state → blank screen on email step.
        setLocation(stripBase(url.pathname + url.search + url.hash));
        return;
      }
    } catch {}
    window.location.href = to;   // cross-origin (e.g. dev_browser flow)
  } else {
    setLocation(stripBase(to));
  }
},
routerReplace: (to) => {
  if (to.startsWith("http")) {
    try {
      const url = new URL(to);
      if (url.origin === window.location.origin) {
        setLocation(stripBase(url.pathname + url.search + url.hash), { replace: true });
        return;
      }
    } catch {}
    window.location.replace(to);
  } else {
    setLocation(stripBase(to), { replace: true });
  }
},
```

**Why the blank screen on Cloudflare but not Replit:**
- Replit uses the dev server (`PROD=false`) → no service worker registered.
- Cloudflare Pages is production build → service worker is active.
- When Clerk calls `routerPush("https://same-origin.com/sign-up/verify-email-address")`, the old code did `window.location.href = to` → full page reload. The service worker may serve stale/cached index.html, breaking Clerk's in-progress sign-up session.
- Fix: detect same-origin absolute URLs and use `setLocation` (SPA nav) instead.

## afterSignUpUrl / afterSignInUrl
Always set both to `"/"` (or `${basePath}/`) in ClerkProvider props so Clerk always redirects to a known route after auth:
```ts
afterSignInUrl: `${basePath}/`,
afterSignUpUrl: `${basePath}/`,
```
Without this, Clerk may redirect to its own dashboard or an undefined URL on some environments.
