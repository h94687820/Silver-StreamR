# Memory Index

- [Express+TS middleware param typing](express-middleware-param-typing.md) — chained middleware typed as plain `Request` forces route params to `string|string[]` project-wide.
- [Generated API client hook conventions](api-client-react-hooks.md) — orval-generated hooks: no-param endpoints take options as arg 0 (not `undefined, options`); check actual return type before assuming `.items`.
- [Clerk + wouter routing bridge](clerk-wouter-routing-bridge.md) — Clerk's routerPush/routerReplace must call wouter's setLocation, not raw history.pushState, or nav appears "stuck" until refresh.
- [Object storage secrets present but bucket unprovisioned](object-storage-secrets-vs-provisioned.md) — env var names existing doesn't mean `setupObjectStorage()` ever ran; check for empty values, not just key presence.
