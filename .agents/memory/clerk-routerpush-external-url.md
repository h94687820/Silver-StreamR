---
name: Clerk routerPush cross-origin redirect bug
description: On production (Cloudflare Pages), Clerk's dev instance needs a cross-origin redirect to set the dev browser token. If routerPush intercepts this, history.pushState throws SecurityError silently and sign-in never completes.
---

## Rule
`routerPush` and `routerReplace` passed to ClerkProvider MUST detect external (http/https) URLs and use `window.location.href` / `window.location.replace` instead of wouter's `setLocation`.

## Why
Clerk dev instances use a redirect to `https://<clerk-fapi-host>/v1/dev_browser?return_url=...` to authenticate the browser session. With `proxyUrl` set (production mode), Clerk passes this full external URL to `routerPush`. `history.pushState` (used by wouter's `setLocation`) throws a SecurityError for cross-origin URLs, silently failing. The dev browser token is never set → all subsequent FAPI calls return `dev_browser_unauthenticated` (401) → Clerk UI goes blank when user tries to sign in.

**This only manifests on Cloudflare Pages (prod)** because:
- Dev (Replit): `proxyUrl = undefined`, Clerk uses native `window.location` for the redirect
- Prod (Cloudflare Pages): `proxyUrl = "/api/__clerk"`, Clerk routes navigation through `routerPush`

## How to Apply
Always guard `routerPush`/`routerReplace` in ClerkProvider with origin check:
```tsx
routerPush: (to: string) => {
  if (to.startsWith("http://") || to.startsWith("https://")) {
    window.location.href = to;
  } else {
    setLocation(stripBase(to));
  }
},
routerReplace: (to: string) => {
  if (to.startsWith("http://") || to.startsWith("https://")) {
    window.location.replace(to);
  } else {
    setLocation(stripBase(to), { replace: true });
  }
},
```
