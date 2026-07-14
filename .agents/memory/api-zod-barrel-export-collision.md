---
name: api-zod barrel export collision with orval-generated params
description: Why lib/api-zod/src/index.ts only re-exports generated/api, not generated/types
---

`lib/api-zod`'s orval "zod" client generates two artifacts with identical PascalCase
names for query-param schemas: a runtime zod object in `generated/api.ts` (e.g.
`export const GetCommentsParams = zod.object(...)`) and a plain TS type in
`generated/types/getCommentsParams.ts` (e.g. `export type GetCommentsParams = {...}`).

If the hand-written barrel (`lib/api-zod/src/index.ts`) does `export *` from both
`./generated/api` and `./generated/types`, TypeScript raises `TS2308` ambiguous-export
errors for every endpoint whose params schema collides this way (seen for
GetComments/GetFollowers/GetFollowing/GetGroupMembers/GetGroupPosts/GetMessages/GetUserPosts,
and it will recur for any new endpoint with the same params-naming pattern).
Marking the types re-export as `export type *` does NOT fix it — TS still treats it as
ambiguous against the value export.

**Why:** This is inherent to the current orval zod-client config, not a one-off typo —
it will resurface on future openapi.yaml changes that add similarly-shaped param objects.

**How to apply:** Keep `lib/api-zod/src/index.ts` re-exporting only `./generated/api`
(the zod schemas/values). Do not blanket `export *` from `./generated/types` in that
package. If new code genuinely needs one of the generated param *types* (not just the
runtime schema), import it directly from the specific `./generated/types/<name>` file
rather than re-exporting the whole types barrel.
