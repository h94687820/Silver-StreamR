---
name: Orval-generated API client hook conventions
description: Calling convention and return-shape gotchas for the @workspace/api-client-react generated hooks used in artifact frontends.
---

The generated React Query hooks (via orval, in `lib/api-client-react/src/generated/api.ts`) drop the
path-params argument entirely when the underlying endpoint has none — the signature becomes
`useXxx(options?)`, not `useXxx(undefined, options?)`. Passing `undefined` as the first arg when there
are no path params is a type error (`Expected 0-1 arguments, but got 2`). Endpoints that do have path
params keep the `useXxx(param1, ..., options?)` shape.

Also: not every list endpoint returns a paginated `{ items: [...] }` shape — some (e.g. stories,
conversations, one of the search endpoints) return a bare array `T[]`. Always check the actual generated
return type (`Awaited<ReturnType<typeof getXxx>>` in the same file) before assuming `.items` exists;
guessing wrong produces `Property 'items' does not exist on type 'T[]'`.

**Why:** Hit this as the root cause of a batch of frontend typecheck failures across several pages/components
after backend middleware fixes surfaced previously-masked errors.

**How to apply:** When wiring a new generated hook, open its definition in the generated api.ts file first
to confirm (a) the exact parameter order/arity and (b) the real return type, rather than copying a pattern
from a different hook in the same file.
