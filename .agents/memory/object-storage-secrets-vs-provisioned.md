---
name: Object storage secrets present but bucket unprovisioned
description: Secret keys (PRIVATE_OBJECT_DIR etc.) showing as "available" doesn't mean the bucket was ever provisioned.
---

An environment snapshot can list `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`,
`DEFAULT_OBJECT_STORAGE_BUCKET_ID` as "available secrets" even when the actual shell env
values are empty strings — e.g. after a remix/fork where the previous owner's plan lapsed
mid-setup. Code that calls `ObjectStorageService.getPrivateObjectDir()` then throws
"PRIVATE_OBJECT_DIR not set", surfacing to the user as a generic upload failure.

**Why:** The "available secrets" list in the environment snapshot reflects declared secret
slots, not confirmed non-empty runtime values. Object storage provisioning
(`setupObjectStorage()`) is a separate, sometimes-skipped step.

**How to apply:** When debugging any storage/upload failure, check actual shell env values
(`echo $PRIVATE_OBJECT_DIR`) or read the server error/stack trace before assuming the
route/auth logic is at fault. If empty, call `setupObjectStorage()` in CodeExecution to
provision the bucket, then restart the API server workflow.
