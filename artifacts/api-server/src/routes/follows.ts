import { Router } from "express";
import { db } from "@workspace/db";
import { followsTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireOnboarding } from "../lib/auth";

const router = Router();

// POST /users/:userId/follow
router.post("/users/:userId/follow", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const followerId = (req as any).user.id;
    const { userId: followingId } = req.params;
    if (followerId === followingId) {
      res.status(400).json({ error: "Cannot follow yourself" }); return;
    }
    await db.insert(followsTable).values({ followerId, followingId }).onConflictDoNothing();
    // Update counts
    await db.update(usersTable).set({ followingCount: sql`${usersTable.followingCount} + 1` }).where(eq(usersTable.id, followerId));
    await db.update(usersTable).set({ followersCount: sql`${usersTable.followersCount} + 1` }).where(eq(usersTable.id, followingId));
    // Notification
    await db.insert(notificationsTable).values({
      id: randomUUID(), recipientId: followingId, actorId: followerId, type: "follow",
    }).onConflictDoNothing();
    // Get updated count
    const target = await db.select({ followersCount: usersTable.followersCount }).from(usersTable).where(eq(usersTable.id, followingId)).limit(1);
    res.json({ following: true, followersCount: target[0]?.followersCount ?? 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /users/:userId/follow
router.delete("/users/:userId/follow", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const followerId = (req as any).user.id;
    const { userId: followingId } = req.params;
    const deleted = await db.delete(followsTable).where(
      and(eq(followsTable.followerId, followerId), eq(followsTable.followingId, followingId))
    ).returning();
    if (deleted.length > 0) {
      await db.update(usersTable).set({ followingCount: sql`GREATEST(${usersTable.followingCount} - 1, 0)` }).where(eq(usersTable.id, followerId));
      await db.update(usersTable).set({ followersCount: sql`GREATEST(${usersTable.followersCount} - 1, 0)` }).where(eq(usersTable.id, followingId));
    }
    const target = await db.select({ followersCount: usersTable.followersCount }).from(usersTable).where(eq(usersTable.id, followingId)).limit(1);
    res.json({ following: false, followersCount: target[0]?.followersCount ?? 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
