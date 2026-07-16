/**
 * POST /storage/uploads
 *
 * رفع ملف إلى FORGE Storage.
 * العميل يرسل الـ binary body مع Content-Type للملف.
 * يُعيد { objectPath } — الرابط العام للملف.
 */
import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { uploadFile } from "../storage";

const router = new Hono<HonoEnv>();

router.post("/storage/uploads", async (c) => {
  try {
    const contentType =
      c.req.header("Content-Type")?.split(";")[0].trim() ?? "application/octet-stream";

    const body = await c.req.arrayBuffer();
    if (!body || body.byteLength === 0) {
      return c.json({ error: "Empty body" }, 400);
    }

    const objectPath = await uploadFile(
      c.env.FORGE_BASE_URL,
      c.env.FORGE_API_KEY,
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
