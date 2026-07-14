import { Router } from "express";
import { db } from "@workspace/db";
import { reactionsTable, postsTable, notificationsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireOnboarding } from "../lib/auth";

const router = Router();

// POST /posts/:postId/react
router.post("/posts/:postId/react", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { postId } = req.params;
    const { type } = req.body; // "like" | "dislike"

    const post = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    if (!post[0]) { res.status(404).json({ error: "Not found" }); return; }

    const existing = await db.select().from(reactionsTable).where(and(eq(reactionsTable.userId, userId), eq(reactionsTable.postId, postId))).limit(1);

    if (existing[0]) {
      // Update if different type
      if (existing[0].type !== type) {
        const oldType = existing[0].type;
        await db.update(reactionsTable).set({ type }).where(and(eq(reactionsTable.userId, userId), eq(reactionsTable.postId, postId)));
        // Adjust counts
        if (oldType === "like") {
          await db.update(postsTable).set({ likesCount: sql`GREATEST(${postsTable.likesCount} - 1, 0)`, dislikesCount: sql`${postsTable.dislikesCount} + 1` }).where(eq(postsTable.id, postId));
        } else {
          await db.update(postsTable).set({ dislikesCount: sql`GREATEST(${postsTable.dislikesCount} - 1, 0)`, likesCount: sql`${postsTable.likesCount} + 1` }).where(eq(postsTable.id, postId));
        }
      }
    } else {
      await db.insert(reactionsTable).values({ userId, postId, type });
      if (type === "like") {
        await db.update(postsTable).set({ likesCount: sql`${postsTable.likesCount} + 1` }).where(eq(postsTable.id, postId));
      } else {
        await db.update(postsTable).set({ dislikesCount: sql`${postsTable.dislikesCount} + 1` }).where(eq(postsTable.id, postId));
      }
      // Notify post author only for likes (not dislikes)
      if (type === "like") {
        await db.insert(notificationsTable).values({
          id: randomUUID(), recipientId: post[0].authorId, actorId: userId,
          type: "like", postId,
        });
      }
    }

    const updated = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    res.json({ myReaction: type, likesCount: updated[0].likesCount, dislikesCount: updated[0].dislikesCount });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /posts/:postId/react
router.delete("/posts/:postId/react", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { postId } = req.params;
    const existing = await db.select().from(reactionsTable).where(and(eq(reactionsTable.userId, userId), eq(reactionsTable.postId, postId))).limit(1);
    if (existing[0]) {
      await db.delete(reactionsTable).where(and(eq(reactionsTable.userId, userId), eq(reactionsTable.postId, postId)));
      if (existing[0].type === "like") {
        await db.update(postsTable).set({ likesCount: sql`GREATEST(${postsTable.likesCount} - 1, 0)` }).where(eq(postsTable.id, postId));
      } else {
        await db.update(postsTable).set({ dislikesCount: sql`GREATEST(${postsTable.dislikesCount} - 1, 0)` }).where(eq(postsTable.id, postId));
      }
    }
    const updated = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    res.json({ myReaction: null, likesCount: updated[0]?.likesCount ?? 0, dislikesCount: updated[0]?.dislikesCount ?? 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
