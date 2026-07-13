import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, and, desc, inArray, count } from "drizzle-orm";
import { requireAuth, requireOnboarding } from "../lib/auth";
import { getUserProfile } from "../lib/helpers";

const router = Router();

// GET /notifications
router.get("/notifications", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const limit = Math.min(Number(req.query.limit) || 30, 50);
    const notifications = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.recipientId, userId))
      .orderBy(desc(notificationsTable.createdAt)).limit(limit);
    const items = await Promise.all(notifications.map(async n => ({
      id: n.id, type: n.type, actorId: n.actorId,
      actor: await getUserProfile(n.actorId, userId),
      postId: n.postId ?? null, commentId: n.commentId ?? null,
      isRead: n.isRead, createdAt: n.createdAt.toISOString(),
    })));
    res.json({ items, nextCursor: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /notifications/read
router.post("/notifications/read", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { ids, all } = req.body;
    if (all) {
      await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.recipientId, userId));
    } else if (ids?.length > 0) {
      await db.update(notificationsTable).set({ isRead: true }).where(
        and(eq(notificationsTable.recipientId, userId), inArray(notificationsTable.id, ids))
      );
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /notifications/unread-count
router.get("/notifications/unread-count", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const result = await db.select({ count: count() }).from(notificationsTable)
      .where(and(eq(notificationsTable.recipientId, userId), eq(notificationsTable.isRead, false)));
    res.json({ count: result[0]?.count ?? 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
