import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { createDb } from "../db";
import { getOrCreateUser } from "../auth";
import { customEmojisTable, usersTable } from "../schema";
import { eq, and, inArray, sql } from "drizzle-orm";

const router = new Hono<HonoEnv>();

async function requireOnboarding(db: ReturnType<typeof createDb>, clerkId: string) {
  const user = await getOrCreateUser(db, clerkId);
  return user.onboardingComplete ? user : null;
}

// GET /emojis/me
router.get("/emojis/me", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const emojis = await db
      .select()
      .from(customEmojisTable)
      .where(eq(customEmojisTable.userId, user.id))
      .orderBy(customEmojisTable.createdAt);
    return c.json({ items: emojis.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })) });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// POST /emojis/me
router.post("/emojis/me", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const { imageUrl, name, isPublic = false } = await c.req.json<Record<string, any>>();
    if (!imageUrl || !name) return c.json({ error: "imageUrl and name are required" }, 400);

    const [emoji] = await db
      .insert(customEmojisTable)
      .values({ id: crypto.randomUUID(), userId: user.id, imageUrl, name, isPublic })
      .returning();
    return c.json({ ...emoji, createdAt: emoji.createdAt.toISOString() }, 201);
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// PATCH /emojis/:emojiId
router.patch("/emojis/:emojiId", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const emojiId = c.req.param("emojiId");
    const { name, isPublic } = await c.req.json<Record<string, any>>();

    const existing = await db
      .select()
      .from(customEmojisTable)
      .where(and(eq(customEmojisTable.id, emojiId), eq(customEmojisTable.userId, user.id)))
      .limit(1);
    if (!existing[0]) return c.json({ error: "Emoji not found" }, 404);

    const [updated] = await db
      .update(customEmojisTable)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(isPublic !== undefined ? { isPublic } : {}),
      })
      .where(eq(customEmojisTable.id, emojiId))
      .returning();
    return c.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// DELETE /emojis/:emojiId
router.delete("/emojis/:emojiId", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const emojiId = c.req.param("emojiId");
    const existing = await db
      .select()
      .from(customEmojisTable)
      .where(and(eq(customEmojisTable.id, emojiId), eq(customEmojisTable.userId, user.id)))
      .limit(1);
    if (!existing[0]) return c.json({ error: "Emoji not found" }, 404);

    await db.delete(customEmojisTable).where(eq(customEmojisTable.id, emojiId));

    // Clear matching emoji references from the user row
    await db
      .update(usersTable)
      .set({
        profileBadgeEmojiId: sql`CASE WHEN profile_badge_emoji_id = ${emojiId} THEN NULL ELSE profile_badge_emoji_id END`,
        postStampEmojiId: sql`CASE WHEN post_stamp_emoji_id = ${emojiId} THEN NULL ELSE post_stamp_emoji_id END`,
        nameDisplayEmojiId: sql`CASE WHEN name_display_emoji_id = ${emojiId} THEN NULL ELSE name_display_emoji_id END`,
      })
      .where(eq(usersTable.id, user.id));

    return c.json({ deleted: true });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// GET /emojis/user/:userId — public emojis of a user
router.get("/emojis/user/:userId", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const userId = c.req.param("userId");
    const emojis = await db
      .select()
      .from(customEmojisTable)
      .where(and(eq(customEmojisTable.userId, userId), eq(customEmojisTable.isPublic, true)))
      .orderBy(customEmojisTable.createdAt);
    return c.json({ items: emojis.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })) });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// PUT /users/me/active-emojis
router.put("/users/me/active-emojis", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const { profileBadgeEmojiId, postStampEmojiId, nameDisplayEmojiId } =
      await c.req.json<Record<string, any>>();

    const ids = [profileBadgeEmojiId, postStampEmojiId, nameDisplayEmojiId].filter(
      (id): id is string => typeof id === "string",
    );
    if (ids.length > 0) {
      const owned = await db
        .select({ id: customEmojisTable.id })
        .from(customEmojisTable)
        .where(inArray(customEmojisTable.id, ids));
      const ownedSet = new Set(owned.map((e) => e.id));
      for (const id of ids) {
        if (!ownedSet.has(id)) return c.json({ error: `Emoji ${id} not owned by user` }, 403);
      }
    }

    await db
      .update(usersTable)
      .set({
        ...(profileBadgeEmojiId !== undefined ? { profileBadgeEmojiId: profileBadgeEmojiId ?? null } : {}),
        ...(postStampEmojiId !== undefined ? { postStampEmojiId: postStampEmojiId ?? null } : {}),
        ...(nameDisplayEmojiId !== undefined ? { nameDisplayEmojiId: nameDisplayEmojiId ?? null } : {}),
      })
      .where(eq(usersTable.id, user.id));

    return c.json({ updated: true });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

export default router;
