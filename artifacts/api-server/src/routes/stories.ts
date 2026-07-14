import { Router } from "express";
import { db } from "@workspace/db";
import { storiesTable, storyViewsTable, followsTable, storyReactionsTable } from "@workspace/db";
import { eq, and, gt, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireOnboarding } from "../lib/auth";
import { getUserProfile } from "../lib/helpers";

const router = Router();

// GET /stories
router.get("/stories", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const now = new Date();

    // Get following
    const following = await db.select({ followingId: followsTable.followingId })
      .from(followsTable).where(eq(followsTable.followerId, userId));
    const followingIds = [userId, ...following.map(f => f.followingId)];

    const stories = await db.select().from(storiesTable)
      .where(and(inArray(storiesTable.authorId, followingIds), gt(storiesTable.expiresAt, now)));

    if (stories.length === 0) {
      res.json([]);
      return;
    }

    const storyIds = stories.map(s => s.id);

    // Fetch views and reactions in parallel
    const [views, allReactions, myReactions] = await Promise.all([
      db.select().from(storyViewsTable).where(eq(storyViewsTable.viewerId, userId)),
      db.select().from(storyReactionsTable).where(inArray(storyReactionsTable.storyId, storyIds)),
      db.select().from(storyReactionsTable).where(
        and(inArray(storyReactionsTable.storyId, storyIds), eq(storyReactionsTable.userId, userId))
      ),
    ]);

    const viewedIds = new Set(views.map(v => v.storyId));
    const myReactionMap = new Map(myReactions.map(r => [r.storyId, r.type]));

    // Build like/dislike count maps
    const likeCountMap = new Map<string, number>();
    const dislikeCountMap = new Map<string, number>();
    for (const r of allReactions) {
      if (r.type === "like") likeCountMap.set(r.storyId, (likeCountMap.get(r.storyId) ?? 0) + 1);
      else dislikeCountMap.set(r.storyId, (dislikeCountMap.get(r.storyId) ?? 0) + 1);
    }

    // Group by author
    const grouped = new Map<string, typeof stories>();
    for (const story of stories) {
      if (!grouped.has(story.authorId)) grouped.set(story.authorId, []);
      grouped.get(story.authorId)!.push(story);
    }

    const result = await Promise.all(Array.from(grouped.entries()).map(async ([authorId, authorStories]) => {
      const user = await getUserProfile(authorId, userId);
      const enriched = authorStories.map(s => ({
        id: s.id, authorId: s.authorId, author: user!,
        mediaUrl: s.mediaUrl, mediaType: s.mediaType,
        viewed: viewedIds.has(s.id),
        myReaction: myReactionMap.get(s.id) ?? null,
        likesCount: likeCountMap.get(s.id) ?? 0,
        dislikesCount: dislikeCountMap.get(s.id) ?? 0,
        expiresAt: s.expiresAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
      }));
      return { user: user!, stories: enriched, hasUnviewed: enriched.some(s => !s.viewed) };
    }));

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /stories
router.post("/stories", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { mediaUrl, mediaType } = req.body;
    if (!mediaUrl || !mediaType) { res.status(400).json({ error: "mediaUrl and mediaType required" }); return; }
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const [story] = await db.insert(storiesTable).values({
      id: randomUUID(), authorId: userId, mediaUrl, mediaType, expiresAt,
    }).returning();
    const author = await getUserProfile(userId, userId);
    res.status(201).json({
      id: story.id, authorId: story.authorId, author: author!,
      mediaUrl: story.mediaUrl, mediaType: story.mediaType,
      viewed: false, myReaction: null, likesCount: 0, dislikesCount: 0,
      expiresAt: story.expiresAt.toISOString(),
      createdAt: story.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /stories/:storyId
router.delete("/stories/:storyId", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const story = await db.select().from(storiesTable).where(eq(storiesTable.id, req.params.storyId)).limit(1);
    if (!story[0]) { res.status(404).json({ error: "Not found" }); return; }
    if (story[0].authorId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(storiesTable).where(eq(storiesTable.id, req.params.storyId));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /stories/:storyId/view
router.post("/stories/:storyId/view", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    await db.insert(storyViewsTable).values({ storyId: req.params.storyId, viewerId: userId }).onConflictDoNothing();
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /stories/:storyId/react
router.post("/stories/:storyId/react", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { type } = req.body;
    if (!type || !["like", "dislike"].includes(type)) {
      res.status(400).json({ error: "type must be 'like' or 'dislike'" });
      return;
    }
    await db.insert(storyReactionsTable).values({
      storyId: req.params.storyId, userId, type,
    }).onConflictDoUpdate({
      target: [storyReactionsTable.storyId, storyReactionsTable.userId],
      set: { type },
    });
    res.json({ myReaction: type });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /stories/:storyId/react
router.delete("/stories/:storyId/react", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    await db.delete(storyReactionsTable).where(
      and(eq(storyReactionsTable.storyId, req.params.storyId), eq(storyReactionsTable.userId, userId))
    );
    res.json({ myReaction: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
