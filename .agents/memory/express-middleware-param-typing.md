---
name: Express + TypeScript middleware param typing pitfall
description: Why req.params ends up typed as string|string[] across an Express 5 + TS route file even for simple single-segment routes, and how to fix it.
---

When a route is registered as `router.get(path, middlewareA, middlewareB, handler)` and any of the
earlier middleware functions are declared with a plain, non-generic `Request`/`Response` annotation
(e.g. `(req: Request, res: Response, next: NextFunction) => ...`), TypeScript's overload resolution
for `router.get`/`post`/etc. infers the shared params type `P` for the *whole handler array* from that
concrete middleware's type, not from the route string literal. Since `Request` defaults to
`Request<ParamsDictionary>` and `ParamsDictionary` is `{ [key: string]: string | string[] }`, every
handler in the chain — including the final route handler — sees `req.params.xxx` as `string | string[]`
instead of the specific literal type inferred from the path (e.g. `{ postId: string }`). This shows up
as a flood of `TS2769`/`TS2339` errors across every route file that chains shared middleware
(auth guards, onboarding checks, etc.), not just one file.

**Why:** Discovered while fixing project-wide typecheck failures in an Express 5 API; the errors looked
scattered across many unrelated route files but all traced back to two shared middleware functions.

**How to apply:** Declare shared middleware as generic functions with default type parameters instead of
concrete `Request`/`Response` annotations:
```ts
export async function requireAuth<P = Record<string, string>, ResBody = any, ReqBody = any, ReqQuery = any>(
  req: Request<P, ResBody, ReqBody, ReqQuery>,
  res: Response<any>,
  next: NextFunction
) { ... }
```
This lets each call site's specific route-literal params flow through instead of being pinned to
`ParamsDictionary`. Apply this to any reusable Express middleware in a TS codebase, not just auth guards.
