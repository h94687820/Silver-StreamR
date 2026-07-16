import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, usersTable, savedPostsTable, followsTable, reactionsTable, groupMembersTable, userSettingsTable } from "@workspace/db";
import { eq, and, desc, lt, inArray, or, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireOnboarding } from "../lib/auth";
import { enrichPost, notifyMentions, extractHashtags } from "../lib/helpers";
import { rankPosts } from "../lib/recommendation";

const router = Router();

// GET /posts (personalised feed)
router.get("/posts", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    // offset-based cursor for ranked feed (string encodes a plain integer)
    const offset = req.query.cursor ? parseInt(req.query.cursor as string, 10) || 0 : 0;

    // Get following IDs
    const following = await db.select({ followingId: followsTable.followingId })
      .from(followsTable).where(eq(followsTable.followerId, userId));
    const followingIds = following.map(f => f.followingId);

    // Fetch a larger candidate pool so the ranker has room to work.
    // Pool = limit × 6, capped at 300, starting from the global offset.
    const poolSize = Math.min(limit * 6, 300);

    const conditions = [
      or(
        inArray(postsTable.authorId, followingIds.length > 0 ? followingIds : [userId]),
        eq(postsTable.authorId, userId),
        eq(postsTable.isPrivate, false)
      )!
    ];

    const pool = await db.select().from(postsTable)
      .where(and(...conditions))
      .orderBy(desc(postsTable.createdAt))
      .limit(poolSize)
      .offset(offset);

    // Rank the candidate pool by personal interest score.
    const ranked = await rankPosts(userId, pool);

    const page = ranked.slice(0, limit);
    const hasMore = ranked.length > limit || pool.length === poolSize;
    const nextCursor = hasMore ? String(offset + poolSize) : null;

    const items = await Promise.all(page.map(p => enrichPost(p, userId)));
    res.json({ items, nextCursor });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /posts
router.post("/posts", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { content, mediaUrls, mediaType, isPrivate, groupId } = req.body;

    if (groupId) {
      const membership = await db.select().from(groupMembersTable).where(
        and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId))
      ).limit(1);
      if (!membership[0]) { res.status(403).json({ error: "You must join the group to post in it" }); return; }
    }

    const post = await db.insert(postsTable).values({
      id: randomUUID(),
      trackingId: randomUUID(),
      authorId: userId,
      groupId: groupId || null,
      content: content || null,
      mediaUrls: mediaUrls || [],
      mediaType: mediaType || null,
      hashtags: extractHashtags(content),
      isPrivate: isPrivate ?? false,
    }).returning();
    await db.update(usersTable).set({ postsCount: sql`${usersTable.postsCount} + 1` }).where(eq(usersTable.id, userId));
    await notifyMentions({ content, actorId: userId, postId: post[0].id });
    const enriched = await enrichPost(post[0], userId);
    res.status(201).json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /posts/videos
router.get("/posts/videos", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = req.query.cursor as string | undefined;
    const conditions = [eq(postsTable.mediaType, "video"), eq(postsTable.isPrivate, false)];
    if (cursor) conditions.push(lt(postsTable.createdAt, new Date(cursor)));
    const posts = await db.select().from(postsTable).where(and(...conditions))
      .orderBy(desc(postsTable.createdAt)).limit(limit + 1);
    const hasMore = posts.length > limit;
    const items = await Promise.all(posts.slice(0, limit).map(p => enrichPost(p, userId)));
    res.json({ items, nextCursor: hasMore ? posts[limit - 1].createdAt.toISOString() : null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /posts/saved
router.get("/posts/saved", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const saved = await db.select({ post: postsTable }).from(savedPostsTable)
      .innerJoin(postsTable, eq(savedPostsTable.postId, postsTable.id))
      .where(eq(savedPostsTable.userId, userId))
      .orderBy(desc(savedPostsTable.savedAt)).limit(limit);
    const items = await Promise.all(saved.map(s => enrichPost(s.post, userId)));
    res.json({ items, nextCursor: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /users/:username/saved-posts
router.get("/users/:username/saved-posts", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const viewerId = (req as any).user.id;
    const targetUser = await db.select().from(usersTable)
      .where(eq(usersTable.username, req.params.username.toLowerCase())).limit(1);
    if (!targetUser[0]) { res.status(404).json({ error: "User not found" }); return; }
    const targetId = targetUser[0].id;

    if (targetId !== viewerId) {
      const settings = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, targetId)).limit(1);
      if (!settings[0]?.savedPostsPublic) {
        res.status(403).json({ error: "This user's favorites are private" });
        return;
      }
    }

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const saved = await db.select({ post: postsTable }).from(savedPostsTable)
      .innerJoin(postsTable, eq(savedPostsTable.postId, postsTable.id))
      .where(eq(savedPostsTable.userId, targetId))
      .orderBy(desc(savedPostsTable.savedAt)).limit(limit);
    const items = await Promise.all(saved.map(s => enrichPost(s.post, viewerId)));
    res.json({ items, nextCursor: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /posts/private
router.get("/posts/private", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const posts = await db.select().from(postsTable)
      .where(and(eq(postsTable.authorId, userId), eq(postsTable.isPrivate, true)))
      .orderBy(desc(postsTable.createdAt)).limit(limit);
    const items = await Promise.all(posts.map(p => enrichPost(p, userId)));
    res.json({ items, nextCursor: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /posts/:postId
router.get("/posts/:postId", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).clerkId;
    const post = await db.select().from(postsTable).where(eq(postsTable.id, req.params.postId)).limit(1);
    if (!post[0]) { res.status(404).json({ error: "Not found" }); return; }
    if (post[0].isPrivate && post[0].authorId !== clerkId) { res.status(403).json({ error: "Forbidden" }); return; }
    res.json(await enrichPost(post[0], clerkId));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /posts/:postId
router.patch("/posts/:postId", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { content, isPrivate } = req.body;
    const post = await db.select().from(postsTable).where(eq(postsTable.id, req.params.postId)).limit(1);
    if (!post[0]) { res.status(404).json({ error: "Not found" }); return; }
    if (post[0].authorId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
    const updated = await db.update(postsTable).set({
      ...(content !== undefined ? { content, hashtags: extractHashtags(content) } : {}),
      ...(isPrivate !== undefined ? { isPrivate } : {}),
      updatedAt: new Date(),
    }).where(eq(postsTable.id, req.params.postId)).returning();
    res.json(await enrichPost(updated[0], userId));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /posts/:postId
router.delete("/posts/:postId", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const post = await db.select().from(postsTable).where(eq(postsTable.id, req.params.postId)).limit(1);
    if (!post[0]) { res.status(404).json({ error: "Not found" }); return; }
    if (post[0].authorId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(postsTable).where(eq(postsTable.id, req.params.postId));
    await db.update(usersTable).set({ postsCount: sql`GREATEST(${usersTable.postsCount} - 1, 0)` }).where(eq(usersTable.id, userId));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /posts/:postId/save
router.post("/posts/:postId/save", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    await db.insert(savedPostsTable).values({ userId, postId: req.params.postId }).onConflictDoNothing();
    res.json({ saved: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /posts/:postId/save
router.delete("/posts/:postId/save", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    await db.delete(savedPostsTable).where(and(eq(savedPostsTable.userId, userId), eq(savedPostsTable.postId, req.params.postId)));
    res.json({ saved: false });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /users/:username/posts
router.get("/users/:username/posts", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).clerkId;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const users = await db.select().from(usersTable).where(eq(usersTable.username, req.params.username.toLowerCase())).limit(1);
    if (!users[0]) { res.status(404).json({ error: "Not found" }); return; }
    const isOwner = users[0].id === clerkId;
    const conditions = [eq(postsTable.authorId, users[0].id)];
    if (!isOwner) conditions.push(eq(postsTable.isPrivate, false));
    const posts = await db.select().from(postsTable).where(and(...conditions)).orderBy(desc(postsTable.createdAt)).limit(limit);
    const items = await Promise.all(posts.map(p => enrichPost(p, clerkId)));
    res.json({ items, nextCursor: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
