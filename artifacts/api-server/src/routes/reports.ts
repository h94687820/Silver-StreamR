import { Router } from "express";
import { requireAuth, requireForgeKey } from "../lib/auth";
import { db } from "@workspace/db";
import { reportsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

// POST /api/reports
router.post("/api/reports", requireAuth, async (req, res) => {
  try {
    const clerkId: string = (req as any).clerkId;
    const {
      mode,
      targetType,
      targetId = "",
      targetUsername,
      reportType,
      description,
      screenshotUrl,
    } = req.body as {
      mode: string;
      targetType: string;
      targetId?: string;
      targetUsername?: string;
      reportType: string;
      description: string;
      screenshotUrl?: string;
    };

    if (!description?.trim()) {
      res.status(400).json({ error: "Description is required" });
      return;
    }
    if (!reportType) {
      res.status(400).json({ error: "Report type is required" });
      return;
    }
    if (!mode || !["general", "specific"].includes(mode)) {
      res.status(400).json({ error: "Invalid mode" });
      return;
    }

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
    }).returning();

    res.status(201).json(report);
  } catch (err) {
    req.log.error(err, "Failed to create report");
    res.status(500).json({ error: "Failed to submit report" });
  }
});

// GET /api/reports/forge — developer read-only access to all reports (requires FORGE_API_KEY)
router.get("/api/reports/forge", requireForgeKey, async (req, res) => {
  try {
    const limit = Math.min(parseInt((req.query as any).limit as string) || 50, 200);
    const offset = parseInt((req.query as any).offset as string) || 0;

    const reports = await db
      .select({
        id: reportsTable.id,
        reporterId: reportsTable.reporterId,
        mode: reportsTable.mode,
        targetType: reportsTable.targetType,
        targetId: reportsTable.targetId,
        targetUsername: reportsTable.targetUsername,
        reportType: reportsTable.reportType,
        description: reportsTable.description,
        screenshotUrl: reportsTable.screenshotUrl,
        status: reportsTable.status,
        createdAt: reportsTable.createdAt,
      })
      .from(reportsTable)
      .orderBy(desc(reportsTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ reports, limit, offset, count: reports.length });
  } catch (err) {
    req.log.error(err, "Failed to fetch reports for forge key");
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

export default router;
