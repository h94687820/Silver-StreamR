import { Router } from "express";
import { db } from "@workspace/db";
import { commentsTable, postsTable, notificationsTable } from "@workspace/db";
import { eq, and, isNull, inArray, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireOnboarding } from "../lib/auth";
import { getUserProfile, notifyMentions } from "../lib/helpers";

const router = Router();

// GET /posts/:postId/comments — top-level only, with repliesCount
router.get("/posts/:postId/comments", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const comments = await db.select().from(commentsTable)
      .where(and(eq(commentsTable.postId, req.params.postId), isNull(commentsTable.parentId)))
      .orderBy(commentsTable.createdAt);

    if (comments.length === 0) { res.json({ items: [], nextCursor: null }); return; }

    // Count replies for each comment in one query
    const replyCounts = await db
      .select({ parentId: commentsTable.parentId, count: sql<number>`cast(count(*) as int)` })
      .from(commentsTable)
      .where(and(
        inArray(commentsTable.parentId, comments.map(c => c.id)),
      ))
      .groupBy(commentsTable.parentId);

    const replyCountMap = new Map(replyCounts.map(r => [r.parentId!, r.count]));

    const enriched = await Promise.all(comments.map(async c => ({
      id: c.id, postId: c.postId, authorId: c.authorId,
      author: await getUserProfile(c.authorId, userId),
      content: c.content,
      parentId: null,
      repliesCount: replyCountMap.get(c.id) ?? 0,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt?.toISOString() ?? null,
    })));

    res.json({ items: enriched, nextCursor: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /posts/:postId/comments — create top-level comment
router.post("/posts/:postId/comments", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { content } = req.body;
    if (!content?.trim()) { res.status(400).json({ error: "content required" }); return; }

    const post = await db.select().from(postsTable).where(eq(postsTable.id, req.params.postId)).limit(1);
    if (!post[0]) { res.status(404).json({ error: "Post not found" }); return; }

    const id = randomUUID();
    await db.insert(commentsTable).values({ id, postId: req.params.postId, authorId: userId, content });
    await db.update(postsTable).set({ commentsCount: sql`${postsTable.commentsCount} + 1` }).where(eq(postsTable.id, req.params.postId));

    await db.insert(notificationsTable).values({
      id: randomUUID(), recipientId: post[0].authorId, actorId: userId,
      type: "comment", postId: req.params.postId, commentId: id,
    });

    await notifyMentions({ content, actorId: userId, postId: req.params.postId, commentId: id });

    const author = await getUserProfile(userId, userId);
    res.status(201).json({
      id, postId: req.params.postId, authorId: userId, author,
      content, parentId: null, repliesCount: 0,
      createdAt: new Date().toISOString(), updatedAt: null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /comments/:commentId/replies
router.get("/comments/:commentId/replies", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const replies = await db.select().from(commentsTable)
      .where(eq(commentsTable.parentId, req.params.commentId))
      .orderBy(commentsTable.createdAt);

    const enriched = await Promise.all(replies.map(async r => ({
      id: r.id, postId: r.postId, authorId: r.authorId,
      author: await getUserProfile(r.authorId, userId),
      content: r.content,
      parentId: r.parentId,
      repliesCount: 0,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt?.toISOString() ?? null,
    })));

    res.json({ items: enriched, nextCursor: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /comments/:commentId/reply — reply to a comment
router.post("/comments/:commentId/reply", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { content } = req.body;
    if (!content?.trim()) { res.status(400).json({ error: "content required" }); return; }

    const parent = await db.select().from(commentsTable).where(eq(commentsTable.id, req.params.commentId)).limit(1);
    if (!parent[0]) { res.status(404).json({ error: "Comment not found" }); return; }

    const id = randomUUID();
    await db.insert(commentsTable).values({
      id, postId: parent[0].postId, authorId: userId,
      parentId: req.params.commentId, content,
    });

    // Notify parent comment author
    await db.insert(notificationsTable).values({
      id: randomUUID(), recipientId: parent[0].authorId, actorId: userId,
      type: "comment", postId: parent[0].postId, commentId: id,
    });

    await notifyMentions({ content, actorId: userId, postId: parent[0].postId, commentId: id });

    const author = await getUserProfile(userId, userId);
    res.status(201).json({
      id, postId: parent[0].postId, authorId: userId, author,
      content, parentId: req.params.commentId, repliesCount: 0,
      createdAt: new Date().toISOString(), updatedAt: null,
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
    if (!content?.trim()) { res.status(400).json({ error: "content required" }); return; }

    const comment = await db.select().from(commentsTable).where(eq(commentsTable.id, req.params.commentId)).limit(1);
    if (!comment[0]) { res.status(404).json({ error: "Not found" }); return; }
    if (comment[0].authorId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

    const [updated] = await db.update(commentsTable)
      .set({ content, updatedAt: new Date() })
      .where(eq(commentsTable.id, req.params.commentId))
      .returning();

    await notifyMentions({ content, actorId: userId, postId: updated.postId, commentId: updated.id });

    const author = await getUserProfile(userId, userId);
    res.json({
      id: updated.id, postId: updated.postId, authorId: updated.authorId, author,
      content: updated.content, parentId: updated.parentId ?? null, repliesCount: 0,
      createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt?.toISOString() ?? null,
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

    // Only decrement count for top-level comments
    if (!comment[0].parentId) {
      await db.update(postsTable)
        .set({ commentsCount: sql`${postsTable.commentsCount} - 1` })
        .where(eq(postsTable.id, comment[0].postId));
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
