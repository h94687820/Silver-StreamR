import { Router } from "express";
import { db } from "@workspace/db";
import { customEmojisTable, usersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, requireOnboarding } from "../lib/auth";
import { randomUUID } from "crypto";

const router = Router();

// GET /emojis/me
router.get("/emojis/me", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id as string;
    const emojis = await db
      .select()
      .from(customEmojisTable)
      .where(eq(customEmojisTable.userId, userId))
      .orderBy(customEmojisTable.createdAt);
    res.json({ items: emojis.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /emojis/me
router.post("/emojis/me", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id as string;
    const { imageUrl, name, isPublic = false } = req.body;
    if (!imageUrl || !name) return void res.status(400).json({ error: "imageUrl and name are required" });

    const emoji = await db.insert(customEmojisTable).values({
      id: randomUUID(),
      userId,
      imageUrl,
      name,
      isPublic,
    }).returning();

    res.status(201).json({ ...emoji[0], createdAt: emoji[0].createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /emojis/:emojiId
router.patch("/emojis/:emojiId", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id as string;
    const { emojiId } = req.params;
    const { name, isPublic } = req.body;

    const existing = await db
      .select()
      .from(customEmojisTable)
      .where(and(eq(customEmojisTable.id, emojiId), eq(customEmojisTable.userId, userId)))
      .limit(1);

    if (!existing[0]) return void res.status(404).json({ error: "Emoji not found" });

    const updated = await db
      .update(customEmojisTable)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(isPublic !== undefined ? { isPublic } : {}),
      })
      .where(eq(customEmojisTable.id, emojiId))
      .returning();

    res.json({ ...updated[0], createdAt: updated[0].createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /emojis/:emojiId
router.delete("/emojis/:emojiId", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id as string;
    const { emojiId } = req.params;

    const existing = await db
      .select()
      .from(customEmojisTable)
      .where(and(eq(customEmojisTable.id, emojiId), eq(customEmojisTable.userId, userId)))
      .limit(1);

    if (!existing[0]) return void res.status(404).json({ error: "Emoji not found" });

    await db.delete(customEmojisTable).where(eq(customEmojisTable.id, emojiId));

    // Clear any active references to this emoji
    const clearFields: Partial<typeof usersTable.$inferSelect> = {};
    if (existing[0].id === (await db.select({ v: usersTable.profileBadgeEmojiId }).from(usersTable).where(eq(usersTable.id, userId)).limit(1))[0]?.v) clearFields.profileBadgeEmojiId = null;

    await db.update(usersTable).set({
      profileBadgeEmojiId: undefined,
      postStampEmojiId: undefined,
      nameDisplayEmojiId: undefined,
    }).where(
      and(
        eq(usersTable.id, userId),
      )
    );

    // Precisely null out only the matching fields
    await db.execute(
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require("drizzle-orm").sql`
        UPDATE users SET
          profile_badge_emoji_id = CASE WHEN profile_badge_emoji_id = ${emojiId} THEN NULL ELSE profile_badge_emoji_id END,
          post_stamp_emoji_id    = CASE WHEN post_stamp_emoji_id    = ${emojiId} THEN NULL ELSE post_stamp_emoji_id    END,
          name_display_emoji_id  = CASE WHEN name_display_emoji_id  = ${emojiId} THEN NULL ELSE name_display_emoji_id  END
        WHERE id = ${userId}
      `
    );

    res.json({ deleted: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /emojis/user/:userId — public emojis of a user
router.get("/emojis/user/:userId", requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const emojis = await db
      .select()
      .from(customEmojisTable)
      .where(and(eq(customEmojisTable.userId, userId), eq(customEmojisTable.isPublic, true)))
      .orderBy(customEmojisTable.createdAt);
    res.json({ items: emojis.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /users/me/active-emojis
router.put("/users/me/active-emojis", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id as string;
    const { profileBadgeEmojiId, postStampEmojiId, nameDisplayEmojiId } = req.body;

    // Validate ownership
    const ids = [profileBadgeEmojiId, postStampEmojiId, nameDisplayEmojiId].filter(
      (id): id is string => typeof id === "string"
    );
    if (ids.length > 0) {
      const owned = await db
        .select({ id: customEmojisTable.id })
        .from(customEmojisTable)
        .where(inArray(customEmojisTable.id, ids));
      const ownedSet = new Set(owned.map(e => e.id));
      for (const id of ids) {
        if (!ownedSet.has(id)) return void res.status(403).json({ error: `Emoji ${id} not owned by user` });
      }
    }

    await db.update(usersTable).set({
      ...(profileBadgeEmojiId !== undefined ? { profileBadgeEmojiId: profileBadgeEmojiId ?? null } : {}),
      ...(postStampEmojiId     !== undefined ? { postStampEmojiId:    postStampEmojiId    ?? null } : {}),
      ...(nameDisplayEmojiId   !== undefined ? { nameDisplayEmojiId:  nameDisplayEmojiId  ?? null } : {}),
    }).where(eq(usersTable.id, userId));

    res.json({ deleted: false });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
