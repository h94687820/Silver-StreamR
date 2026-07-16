import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { db } from "@workspace/db";
import { reportsTable } from "@workspace/db";
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

export default router;
