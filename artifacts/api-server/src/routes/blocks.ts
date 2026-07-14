import { Router } from "express";
import { db } from "@workspace/db";
import { blocksTable, usersTable, followsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireOnboarding } from "../lib/auth";
import { getUserProfile } from "../lib/helpers";

const router = Router();

// POST /users/:userId/block
router.post("/users/:userId/block", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const blockerId = (req as any).user.id;
    const { userId: blockedId } = req.params;
    if (blockerId === blockedId) {
      res.status(400).json({ error: "Cannot block yourself" }); return;
    }
    await db.insert(blocksTable).values({ blockerId, blockedId }).onConflictDoNothing();
    // Also unfollow each other when blocking
    await db.delete(followsTable).where(
      and(eq(followsTable.followerId, blockerId), eq(followsTable.followingId, blockedId))
    );
    await db.delete(followsTable).where(
      and(eq(followsTable.followerId, blockedId), eq(followsTable.followingId, blockerId))
    );
    res.json({ blocked: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /users/:userId/block
router.delete("/users/:userId/block", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const blockerId = (req as any).user.id;
    const { userId: blockedId } = req.params;
    await db.delete(blocksTable).where(
      and(eq(blocksTable.blockerId, blockerId), eq(blocksTable.blockedId, blockedId))
    );
    res.json({ blocked: false });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /users/me/blocked
router.get("/users/me/blocked", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const blockerId = (req as any).user.id;
    const blocks = await db.select().from(blocksTable).where(eq(blocksTable.blockerId, blockerId));
    const profiles = await Promise.all(blocks.map(b => getUserProfile(b.blockedId, blockerId)));
    res.json({ items: profiles.filter(Boolean), nextCursor: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
