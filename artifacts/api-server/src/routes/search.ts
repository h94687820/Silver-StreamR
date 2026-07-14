import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, postsTable } from "@workspace/db";
import { ilike, or, eq, and, desc } from "drizzle-orm";
import { requireAuth, requireOnboarding } from "../lib/auth";
import { getUserProfile, enrichPost } from "../lib/helpers";

const router = Router();

// GET /search/users
router.get("/search/users", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const clerkId = (req as any).user.id;
    const q = (req.query.q as string) || "";
    const limit = Math.min(Number(req.query.limit) || 20, 30);
    if (!q.trim()) { res.json([]); return; }
    const users = await db.select().from(usersTable)
      .where(or(ilike(usersTable.username, `%${q}%`), ilike(usersTable.displayName, `%${q}%`))!)
      .limit(limit);
    const profiles = await Promise.all(users.map(u => getUserProfile(u.id, clerkId)));
    res.json(profiles.filter(Boolean));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /search/posts
router.get("/search/posts", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const clerkId = (req as any).user.id;
    const q = (req.query.q as string) || "";
    const limit = Math.min(Number(req.query.limit) || 20, 30);
    if (!q.trim()) { res.json({ items: [], nextCursor: null }); return; }
    const posts = await db.select().from(postsTable)
      .where(and(ilike(postsTable.content, `%${q}%`), eq(postsTable.isPrivate, false)))
      .orderBy(desc(postsTable.createdAt)).limit(limit);
    const items = await Promise.all(posts.map(p => enrichPost(p, clerkId)));
    res.json({ items, nextCursor: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /search/videos
router.get("/search/videos", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const clerkId = (req as any).user.id;
    const q = (req.query.q as string) || "";
    const limit = Math.min(Number(req.query.limit) || 20, 30);
    if (!q.trim()) { res.json({ items: [], nextCursor: null }); return; }
    const posts = await db.select().from(postsTable)
      .where(and(
        ilike(postsTable.content, `%${q}%`),
        eq(postsTable.isPrivate, false),
        eq(postsTable.mediaType, "video"),
      ))
      .orderBy(desc(postsTable.createdAt)).limit(limit);
    const items = await Promise.all(posts.map(p => enrichPost(p, clerkId)));
    res.json({ items, nextCursor: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
