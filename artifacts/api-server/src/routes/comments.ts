import { Router } from "express";
import { db } from "@workspace/db";
import { commentsTable, postsTable, notificationsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireOnboarding } from "../lib/auth";
import { getUserProfile, notifyMentions } from "../lib/helpers";

const router = Router();

// GET /posts/:postId/comments
router.get("/posts/:postId/comments", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).clerkId;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const comments = await db.select().from(commentsTable)
      .where(eq(commentsTable.postId, req.params.postId))
      .orderBy(desc(commentsTable.createdAt)).limit(limit);
    const items = await Promise.all(comments.map(async c => ({
      id: c.id,
      postId: c.postId,
      authorId: c.authorId,
      author: await getUserProfile(c.authorId, clerkId),
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt ? c.updatedAt.toISOString() : null,
    })));
    res.json({ items, nextCursor: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /posts/:postId/comments
router.post("/posts/:postId/comments", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { content } = req.body;
    if (!content) { res.status(400).json({ error: "Content required" }); return; }
    const post = await db.select().from(postsTable).where(eq(postsTable.id, req.params.postId)).limit(1);
    if (!post[0]) { res.status(404).json({ error: "Not found" }); return; }

    const [comment] = await db.insert(commentsTable).values({
      id: randomUUID(), postId: req.params.postId, authorId: userId, content,
    }).returning();
    await db.update(postsTable).set({ commentsCount: sql`${postsTable.commentsCount} + 1` }).where(eq(postsTable.id, req.params.postId));

    if (post[0].authorId !== userId) {
      await db.insert(notificationsTable).values({
        id: randomUUID(), recipientId: post[0].authorId, actorId: userId,
        type: "comment", postId: req.params.postId, commentId: comment.id,
      });
    }
    await notifyMentions({ content, actorId: userId, postId: req.params.postId, commentId: comment.id });

    const author = await getUserProfile(userId, userId);
    res.status(201).json({
      id: comment.id, postId: comment.postId, authorId: comment.authorId,
      author, content: comment.content, createdAt: comment.createdAt.toISOString(),
      updatedAt: null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /comments/:commentId
router.patch("/comments/:commentId", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { content } = req.body;
    if (!content || !String(content).trim()) { res.status(400).json({ error: "Content required" }); return; }
    const comment = await db.select().from(commentsTable).where(eq(commentsTable.id, req.params.commentId)).limit(1);
    if (!comment[0]) { res.status(404).json({ error: "Not found" }); return; }
    if (comment[0].authorId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

    const [updated] = await db.update(commentsTable).set({
      content, updatedAt: new Date(),
    }).where(eq(commentsTable.id, req.params.commentId)).returning();

    await notifyMentions({ content, actorId: userId, postId: updated.postId, commentId: updated.id });

    const author = await getUserProfile(updated.authorId, userId);
    res.json({
      id: updated.id, postId: updated.postId, authorId: updated.authorId,
      author, content: updated.content, createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt ? updated.updatedAt.toISOString() : null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /comments/:commentId
router.delete("/comments/:commentId", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const comment = await db.select().from(commentsTable).where(eq(commentsTable.id, req.params.commentId)).limit(1);
    if (!comment[0]) { res.status(404).json({ error: "Not found" }); return; }
    if (comment[0].authorId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(commentsTable).where(eq(commentsTable.id, req.params.commentId));
    await db.update(postsTable).set({ commentsCount: sql`GREATEST(${postsTable.commentsCount} - 1, 0)` }).where(eq(postsTable.id, comment[0].postId));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
