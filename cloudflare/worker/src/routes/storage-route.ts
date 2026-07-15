/**
 * POST /storage/uploads
 *
 * Upload a file directly to the configured S3-compatible storage.
 * Client sends the raw binary body with Content-Type set to the file's MIME type.
 * Returns { objectPath } — the public URL of the uploaded file.
 */
import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { createStorageClient, uploadFile } from "../storage";

const router = new Hono<HonoEnv>();

router.post("/storage/uploads", async (c) => {
  try {
    const contentType =
      c.req.header("Content-Type")?.split(";")[0].trim() ?? "application/octet-stream";

    const body = await c.req.arrayBuffer();
    if (!body || body.byteLength === 0) {
      return c.json({ error: "Empty body" }, 400);
    }

    const client = createStorageClient(
      c.env.STORAGE_ACCESS_KEY_ID,
      c.env.STORAGE_SECRET_ACCESS_KEY,
      c.env.STORAGE_REGION || "auto",
    );

    const objectPath = await uploadFile(
      client,
      c.env.STORAGE_ENDPOINT,
      c.env.STORAGE_BUCKET,
      c.env.STORAGE_PUBLIC_URL,
      body,
      contentType,
    );

    return c.json({ objectPath });
  } catch (err) {
    console.error("Storage upload error:", err);
    return c.json({ error: "Failed to upload file" }, 500);
  }
});

export default router;
