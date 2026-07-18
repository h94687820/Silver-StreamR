/**
 * POST /storage/uploads
 *
 * رفع ملف إلى FORGE Storage عبر Service Binding (اتصال مباشر بدون HTTP).
 * العميل يرسل الـ binary body مع Content-Type للملف.
 * يُعيد { objectPath } — المسار الذي يُستخدم لبناء رابط التحميل.
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
      c.env.FORGE_SERVICE,   // Service Binding — يتجاوز قيد 1042
    );

    return c.json({ objectPath });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Storage upload error:", msg);
    return c.json({ error: "Failed to upload file" }, 500);
  }
});

export default router;
