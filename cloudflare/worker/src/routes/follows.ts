import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { createDb } from "../db";
import { getOrCreateUser } from "../auth";
import { followsTable, usersTable, notificationsTable } from "../schema";
import { eq, and, sql } from "drizzle-orm";

const router = new Hono<HonoEnv>();

async function requireOnboarding(db: ReturnType<typeof createDb>, clerkId: string) {
  const user = await getOrCreateUser(db, clerkId);
  return user.onboardingComplete ? user : null;
}

// POST /users/:userId/follow
router.post("/users/:userId/follow", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const followingId = c.req.param("userId");
    const followerId = user.id;
    if (followerId === followingId) return c.json({ error: "Cannot follow yourself" }, 400);

    await db
      .insert(followsTable)
      .values({ followerId, followingId })
      .onConflictDoNothing();
    await db
      .update(usersTable)
      .set({ followingCount: sql`${usersTable.followingCount} + 1` })
      .where(eq(usersTable.id, followerId));
    await db
      .update(usersTable)
      .set({ followersCount: sql`${usersTable.followersCount} + 1` })
      .where(eq(usersTable.id, followingId));
    await db
      .insert(notificationsTable)
      .values({
        id: crypto.randomUUID(),
        recipientId: followingId,
        actorId: followerId,
        type: "follow",
      })
      .onConflictDoNothing();

    const target = await db
      .select({ followersCount: usersTable.followersCount })
      .from(usersTable)
      .where(eq(usersTable.id, followingId))
      .limit(1);
    return c.json({ following: true, followersCount: target[0]?.followersCount ?? 0 });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// DELETE /users/:userId/follow
router.delete("/users/:userId/follow", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const followingId = c.req.param("userId");
    const followerId = user.id;

    const deleted = await db
      .delete(followsTable)
      .where(and(eq(followsTable.followerId, followerId), eq(followsTable.followingId, followingId)))
      .returning();

    if (deleted.length > 0) {
      await db
        .update(usersTable)
        .set({ followingCount: sql`GREATEST(${usersTable.followingCount} - 1, 0)` })
        .where(eq(usersTable.id, followerId));
      await db
        .update(usersTable)
        .set({ followersCount: sql`GREATEST(${usersTable.followersCount} - 1, 0)` })
        .where(eq(usersTable.id, followingId));
    }

    const target = await db
      .select({ followersCount: usersTable.followersCount })
      .from(usersTable)
      .where(eq(usersTable.id, followingId))
      .limit(1);
    return c.json({ following: false, followersCount: target[0]?.followersCount ?? 0 });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

export default router;
