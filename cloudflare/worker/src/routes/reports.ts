import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { createDb } from "../db";
import { reportsTable } from "../schema";
import { getOrCreateUser } from "../auth";
import { randomUUID } from "crypto";

const router = new Hono<HonoEnv>();

// POST /api/reports — authenticated (Clerk)
router.post("/reports", async (c) => {
  try {
    const clerkId = c.get("clerkId");
    const body = await c.req.json<{
      mode: string;
      targetType: string;
      targetId?: string;
      targetUsername?: string;
      reportType: string;
      description: string;
      screenshotUrl?: string;
    }>();

    const { mode, targetType, targetId = "", targetUsername, reportType, description, screenshotUrl } = body;

    if (!description?.trim()) return c.json({ error: "Description is required" }, 400);
    if (!reportType) return c.json({ error: "Report type is required" }, 400);
    if (!mode || !["general", "specific"].includes(mode)) return c.json({ error: "Invalid mode" }, 400);

    const db = createDb(c.env.DB);

    // تأكد من وجود المستخدم في D1 قبل الإدراج (تجنباً لخطأ المفتاح الخارجي)
    await getOrCreateUser(db, clerkId);

    const [report] = await db.insert(reportsTable).values({
      id: randomUUID(),
      reporterId: clerkId,
      mode,
      targetType: targetType || "user",
      targetId: targetId || "",
      targetUsername: targetUsername || null,
      reportType,
      description: description.trim(),
      screenshotUrl: screenshotUrl || null,
      status: "pending",
      createdAt: new Date(),
    }).returning();

    return c.json(report, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to submit report:", message);
    return c.json({ error: "Failed to submit report", detail: message }, 500);
  }
});

export default router;
