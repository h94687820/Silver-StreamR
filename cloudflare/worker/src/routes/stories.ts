import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { createDb } from "../db";
import { getOrCreateUser } from "../auth";
import { getUserProfile } from "../helpers";
import { storiesTable, storyViewsTable, followsTable, storyReactionsTable } from "../schema";
import { eq, and, gt, inArray } from "drizzle-orm";

const router = new Hono<HonoEnv>();

async function requireOnboarding(db: ReturnType<typeof createDb>, clerkId: string) {
  const user = await getOrCreateUser(db, clerkId);
  return user.onboardingComplete ? user : null;
}

// GET /stories
router.get("/stories", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const userId = user.id;
    const now = new Date();

    const following = await db
      .select({ followingId: followsTable.followingId })
      .from(followsTable)
      .where(eq(followsTable.followerId, userId));
    const followingIds = [userId, ...following.map((f) => f.followingId)];

    const stories = await db
      .select()
      .from(storiesTable)
      .where(and(inArray(storiesTable.authorId, followingIds), gt(storiesTable.expiresAt, now)));

    if (stories.length === 0) return c.json([]);

    const storyIds = stories.map((s) => s.id);

    const [views, allReactions, myReactions] = await Promise.all([
      db.select().from(storyViewsTable).where(eq(storyViewsTable.viewerId, userId)),
      db
        .select()
        .from(storyReactionsTable)
        .where(inArray(storyReactionsTable.storyId, storyIds)),
      db
        .select()
        .from(storyReactionsTable)
        .where(
          and(
            inArray(storyReactionsTable.storyId, storyIds),
            eq(storyReactionsTable.userId, userId),
          ),
        ),
    ]);

    const viewedIds = new Set(views.map((v) => v.storyId));
    const myReactionMap = new Map(myReactions.map((r) => [r.storyId, r.type]));

    const likeCountMap = new Map<string, number>();
    const dislikeCountMap = new Map<string, number>();
    for (const r of allReactions) {
      if (r.type === "like")
        likeCountMap.set(r.storyId, (likeCountMap.get(r.storyId) ?? 0) + 1);
      else dislikeCountMap.set(r.storyId, (dislikeCountMap.get(r.storyId) ?? 0) + 1);
    }

    const grouped = new Map<string, typeof stories>();
    for (const story of stories) {
      if (!grouped.has(story.authorId)) grouped.set(story.authorId, []);
      grouped.get(story.authorId)!.push(story);
    }

    const result = await Promise.all(
      Array.from(grouped.entries()).map(async ([authorId, authorStories]) => {
        const storyUser = await getUserProfile(db, authorId, userId);
        const enriched = authorStories.map((s) => ({
          id: s.id,
          authorId: s.authorId,
          author: storyUser!,
          mediaUrl: s.mediaUrl,
          mediaType: s.mediaType,
          viewed: viewedIds.has(s.id),
          myReaction: myReactionMap.get(s.id) ?? null,
          likesCount: likeCountMap.get(s.id) ?? 0,
          dislikesCount: dislikeCountMap.get(s.id) ?? 0,
          expiresAt: s.expiresAt.toISOString(),
          createdAt: s.createdAt.toISOString(),
        }));
        return {
          user: storyUser!,
          stories: enriched,
          hasUnviewed: enriched.some((s) => !s.viewed),
        };
      }),
    );

    return c.json(result);
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// POST /stories
router.post("/stories", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const { mediaUrl, mediaType } = await c.req.json<Record<string, any>>();
    if (!mediaUrl || !mediaType)
      return c.json({ error: "mediaUrl and mediaType required" }, 400);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const [story] = await db
      .insert(storiesTable)
      .values({ id: crypto.randomUUID(), authorId: user.id, mediaUrl, mediaType, expiresAt })
      .returning();

    const author = await getUserProfile(db, user.id, user.id);
    return c.json(
      {
        id: story.id,
        authorId: story.authorId,
        author: author!,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        viewed: false,
        myReaction: null,
        likesCount: 0,
        dislikesCount: 0,
        expiresAt: story.expiresAt.toISOString(),
        createdAt: story.createdAt.toISOString(),
      },
      201,
    );
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// DELETE /stories/:storyId
router.delete("/stories/:storyId", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const storyId = c.req.param("storyId");
    const story = await db.select().from(storiesTable).where(eq(storiesTable.id, storyId)).limit(1);
    if (!story[0]) return c.json({ error: "Not found" }, 404);
    if (story[0].authorId !== user.id) return c.json({ error: "Forbidden" }, 403);
    await db.delete(storiesTable).where(eq(storiesTable.id, storyId));
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// POST /stories/:storyId/view
router.post("/stories/:storyId/view", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    await db
      .insert(storyViewsTable)
      .values({ storyId: c.req.param("storyId"), viewerId: user.id })
      .onConflictDoNothing();
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// POST /stories/:storyId/react
router.post("/stories/:storyId/react", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const { type } = await c.req.json<{ type: string }>();
    if (!type || !["like", "dislike"].includes(type))
      return c.json({ error: "type must be 'like' or 'dislike'" }, 400);

    await db
      .insert(storyReactionsTable)
      .values({ storyId: c.req.param("storyId"), userId: user.id, type })
      .onConflictDoUpdate({
        target: [storyReactionsTable.storyId, storyReactionsTable.userId],
        set: { type },
      });
    return c.json({ myReaction: type });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// DELETE /stories/:storyId/react
router.delete("/stories/:storyId/react", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    await db
      .delete(storyReactionsTable)
      .where(
        and(
          eq(storyReactionsTable.storyId, c.req.param("storyId")),
          eq(storyReactionsTable.userId, user.id),
        ),
      );
    return c.json({ myReaction: null });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

export default router;
