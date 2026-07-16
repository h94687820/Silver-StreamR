import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, userInteractionsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireOnboarding } from "../lib/auth";

const router = Router();

// Action → weight mapping (used server-side for validation)
const VALID_ACTIONS = new Set(["view", "like", "dislike", "comment", "save"]);

/**
 * POST /interactions/track
 * Records a user behaviour event for the recommendation engine.
 * Fire-and-forget from the client — always returns 200.
 */
router.post("/interactions/track", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { postId, action } = req.body;

    if (!postId || !action || !VALID_ACTIONS.has(action)) {
      res.json({ ok: true }); // Silently ignore bad input
      return;
    }

    // Fetch post metadata so we can denormalise into the interaction row.
    const post = await db
      .select({
        id: postsTable.id,
        authorId: postsTable.authorId,
        groupId: postsTable.groupId,
        mediaType: postsTable.mediaType,
        hashtags: postsTable.hashtags,
      })
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .limit(1);

    if (!post[0]) { res.json({ ok: true }); return; }

    const p = post[0];

    // Deduplicate "view" events: skip if already recorded within the last hour.
    if (action === "view") {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recent = await db
        .select({ id: userInteractionsTable.id })
        .from(userInteractionsTable)
        .where(
          and(
            eq(userInteractionsTable.userId, userId),
            eq(userInteractionsTable.postId, postId),
            eq(userInteractionsTable.action, "view"),
            gt(userInteractionsTable.createdAt, oneHourAgo),
          ),
        )
        .limit(1);

      if (recent[0]) { res.json({ ok: true }); return; }
    }

    await db.insert(userInteractionsTable).values({
      id: randomUUID(),
      userId,
      postId,
      action,
      mediaType: p.mediaType,
      hashtags: p.hashtags,
      groupId: p.groupId,
      authorId: p.authorId,
    });

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    // Still return 200 — tracking failures must not break the UI.
    res.json({ ok: true });
  }
});

export default router;
