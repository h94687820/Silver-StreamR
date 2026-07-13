import { Router } from "express";
import { db } from "@workspace/db";
import { storiesTable, storyViewsTable, followsTable } from "@workspace/db";
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

    const views = await db.select().from(storyViewsTable).where(eq(storyViewsTable.viewerId, userId));
    const viewedIds = new Set(views.map(v => v.storyId));

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
      viewed: false,
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

export default router;
