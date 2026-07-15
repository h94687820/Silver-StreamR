import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { createDb } from "../db";
import { getOrCreateUser } from "../auth";
import { getUserProfile } from "../helpers";
import { blocksTable, followsTable } from "../schema";
import { eq, and } from "drizzle-orm";

const router = new Hono<HonoEnv>();

async function requireOnboarding(db: ReturnType<typeof createDb>, clerkId: string) {
  const user = await getOrCreateUser(db, clerkId);
  return user.onboardingComplete ? user : null;
}

// POST /users/:userId/block
router.post("/users/:userId/block", async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const blockedId = c.req.param("userId");
    const blockerId = user.id;
    if (blockerId === blockedId) return c.json({ error: "Cannot block yourself" }, 400);

    await db.insert(blocksTable).values({ blockerId, blockedId }).onConflictDoNothing();
    await db
      .delete(followsTable)
      .where(and(eq(followsTable.followerId, blockerId), eq(followsTable.followingId, blockedId)));
    await db
      .delete(followsTable)
      .where(and(eq(followsTable.followerId, blockedId), eq(followsTable.followingId, blockerId)));
    return c.json({ blocked: true });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// DELETE /users/:userId/block
router.delete("/users/:userId/block", async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const blockedId = c.req.param("userId");
    await db
      .delete(blocksTable)
      .where(and(eq(blocksTable.blockerId, user.id), eq(blocksTable.blockedId, blockedId)));
    return c.json({ blocked: false });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// GET /users/me/blocked
router.get("/users/me/blocked", async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const blocks = await db
      .select()
      .from(blocksTable)
      .where(eq(blocksTable.blockerId, user.id));
    const profiles = await Promise.all(blocks.map((b) => getUserProfile(db, b.blockedId, user.id)));
    return c.json({ items: profiles.filter(Boolean), nextCursor: null });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

export default router;
