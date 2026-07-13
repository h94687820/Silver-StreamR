---
name: Clerk + wouter routing bridge
description: Clerk's routerPush/routerReplace must call wouter's setLocation, not raw history.pushState/replaceState.
---

If a Clerk-authenticated app (React + wouter) passes `routerPush`/`routerReplace` that call
`window.history.pushState`/`replaceState` directly, wouter's router never re-renders because
wouter doesn't listen for programmatic history mutations (only its own `setLocation` calls
trigger a re-render). Symptom: after finishing sign-up/sign-in (or any Clerk-driven navigation,
e.g. OAuth callback, factor-one step), the UI stays stuck on the old screen until the user
manually refreshes the page — even though `useUser()`/`isSignedIn` is actually updated internally.

**Why:** Clerk calls `routerPush`/`routerReplace` for its internal navigation; wouter's
`<Switch>`/`<Route>` tree only reacts to location changes made through wouter's own
`setLocation` (from `useLocation()`), not raw `history.pushState`.

**How to apply:** Wire `routerPush={(to) => setLocation(stripBase(to))}` and
`routerReplace={(to) => setLocation(stripBase(to), { replace: true })}` using
`const [, setLocation] = useLocation();` from `wouter` inside the component that renders
`<ClerkProvider>`. This is also the canonical pattern in the `clerk-auth` skill's
setup-and-customization reference — always diff against it when Clerk nav seems "stuck".
