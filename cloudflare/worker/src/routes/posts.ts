import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { createDb } from "../db";
import { getOrCreateUser } from "../auth";
import { enrichPost, notifyMentions, extractHashtags } from "../helpers";
import {
  postsTable,
  usersTable,
  savedPostsTable,
  followsTable,
  groupMembersTable,
  userSettingsTable,
} from "../schema";
import { eq, and, desc, lt, inArray, or, sql, isNull } from "drizzle-orm";

const router = new Hono<HonoEnv>();

// Inline onboarding check helper
async function checkOnboarding(db: ReturnType<typeof createDb>, clerkId: string) {
  if (clerkId === "admin" || clerkId === "delete-viewer") return { id: clerkId, onboardingComplete: true, acceptedTerms: true } as any;
  const user = await getOrCreateUser(db, clerkId);
  if (!user.onboardingComplete) return null;
  return user;
}

// GET /posts (feed)
router.get("/posts", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const canSeeDeleted = c.get("canSeeDeleted");
    const user = await checkOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const limit = Math.min(Number(c.req.query("limit")) || 20, 50);
    const cursor = c.req.query("cursor");
    const userId = user.id;

    if (canSeeDeleted && (clerkId === "admin" || clerkId === "delete-viewer")) {
      // مفتاح الحذف/المشرف: يرى كل المنشورات بما فيها المحذوفة
      const conditions: any[] = [];
      if (cursor) conditions.push(lt(postsTable.createdAt, new Date(cursor)));
      const posts = await db
        .select()
        .from(postsTable)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(postsTable.createdAt))
        .limit(limit + 1);
      const hasMore = posts.length > limit;
      const items = await Promise.all(posts.slice(0, limit).map((p) => enrichPost(db, p, userId)));
      return c.json({ items, nextCursor: hasMore ? posts[limit - 1].createdAt.toISOString() : null });
    }

    const following = await db
      .select({ followingId: followsTable.followingId })
      .from(followsTable)
      .where(eq(followsTable.followerId, userId));
    const followingIds = following.map((f) => f.followingId);

    const conditions: ReturnType<typeof eq>[] = [isNull(postsTable.deletedAt) as any];
    if (followingIds.length > 0) {
      conditions.push(
        or(
          inArray(postsTable.authorId, followingIds),
          eq(postsTable.authorId, userId),
          eq(postsTable.isPrivate, false),
        ) as any,
      );
    } else {
      conditions.push(
        or(eq(postsTable.authorId, userId), eq(postsTable.isPrivate, false)) as any,
      );
    }
    if (cursor) conditions.push(lt(postsTable.createdAt, new Date(cursor)) as any);

    const posts = await db
      .select()
      .from(postsTable)
      .where(and(...conditions))
      .orderBy(desc(postsTable.createdAt))
      .limit(limit + 1);

    const hasMore = posts.length > limit;
    const items = await Promise.all(posts.slice(0, limit).map((p) => enrichPost(db, p, userId)));
    const nextCursor = hasMore ? posts[limit - 1].createdAt.toISOString() : null;
    return c.json({ items, nextCursor });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// POST /posts
router.post("/posts", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await checkOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const { content, mediaUrls, mediaType, isPrivate, groupId } =
      await c.req.json<Record<string, any>>();
    const userId = user.id;

    if (groupId) {
      const membership = await db
        .select()
        .from(groupMembersTable)
        .where(
          and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)),
        )
        .limit(1);
      if (!membership[0])
        return c.json({ error: "You must join the group to post in it" }, 403);
    }

    const [post] = await db
      .insert(postsTable)
      .values({
        id: crypto.randomUUID(),
        trackingId: crypto.randomUUID(),
        authorId: userId,
        groupId: groupId || null,
        content: content || null,
        mediaUrls: mediaUrls || [],
        mediaType: mediaType || null,
        hashtags: extractHashtags(content),
        isPrivate: isPrivate ?? false,
      })
      .returning();

    await db
      .update(usersTable)
      .set({ postsCount: sql`${usersTable.postsCount} + 1` })
      .where(eq(usersTable.id, userId));
    await notifyMentions(db, { content, actorId: userId, postId: post.id });
    const enriched = await enrichPost(db, post, userId);
    return c.json(enriched, 201);
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// GET /posts/videos
router.get("/posts/videos", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const isAdmin = c.get("isAdmin"); const canSeeDeleted = c.get("canSeeDeleted");
    const user = await checkOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const limit = Math.min(Number(c.req.query("limit")) || 20, 50);
    const cursor = c.req.query("cursor");
    const conditions: any[] = [eq(postsTable.mediaType, "video"), eq(postsTable.isPrivate, false)];
    if (!canSeeDeleted) conditions.push(isNull(postsTable.deletedAt));
    if (cursor) conditions.push(lt(postsTable.createdAt, new Date(cursor)));

    const posts = await db
      .select()
      .from(postsTable)
      .where(and(...conditions))
      .orderBy(desc(postsTable.createdAt))
      .limit(limit + 1);

    const hasMore = posts.length > limit;
    const items = await Promise.all(
      posts.slice(0, limit).map((p) => enrichPost(db, p, user.id)),
    );
    return c.json({ items, nextCursor: hasMore ? posts[limit - 1].createdAt.toISOString() : null });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// GET /posts/saved
router.get("/posts/saved", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const isAdmin = c.get("isAdmin"); const canSeeDeleted = c.get("canSeeDeleted");
    const user = await checkOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const limit = Math.min(Number(c.req.query("limit")) || 20, 50);
    const savedConditions: any[] = [eq(savedPostsTable.userId, user.id)];
    if (!canSeeDeleted) savedConditions.push(isNull(postsTable.deletedAt));

    const saved = await db
      .select({ post: postsTable })
      .from(savedPostsTable)
      .innerJoin(postsTable, eq(savedPostsTable.postId, postsTable.id))
      .where(and(...savedConditions))
      .orderBy(desc(savedPostsTable.savedAt))
      .limit(limit);
    const items = await Promise.all(saved.map((s) => enrichPost(db, s.post, user.id)));
    return c.json({ items, nextCursor: null });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// GET /posts/private
router.get("/posts/private", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const isAdmin = c.get("isAdmin"); const canSeeDeleted = c.get("canSeeDeleted");
    const user = await checkOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const limit = Math.min(Number(c.req.query("limit")) || 20, 50);
    const conditions: any[] = [eq(postsTable.authorId, user.id), eq(postsTable.isPrivate, true)];
    if (!canSeeDeleted) conditions.push(isNull(postsTable.deletedAt));

    const posts = await db
      .select()
      .from(postsTable)
      .where(and(...conditions))
      .orderBy(desc(postsTable.createdAt))
      .limit(limit);
    const items = await Promise.all(posts.map((p) => enrichPost(db, p, user.id)));
    return c.json({ items, nextCursor: null });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// GET /posts/:postId  (auth only, no onboarding)
router.get("/posts/:postId", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const isAdmin = c.get("isAdmin"); const canSeeDeleted = c.get("canSeeDeleted");
    const post = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.id, c.req.param("postId")))
      .limit(1);
    if (!post[0]) return c.json({ error: "Not found" }, 404);
    // المشرف يرى المحذوف، غيره لا
    if (!canSeeDeleted && post[0].deletedAt) return c.json({ error: "Not found" }, 404);
    if (post[0].isPrivate && post[0].authorId !== clerkId && !isAdmin)
      return c.json({ error: "Forbidden" }, 403);
    return c.json(await enrichPost(db, post[0], clerkId));
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// PATCH /posts/:postId
router.patch("/posts/:postId", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await checkOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const { content, isPrivate } = await c.req.json<Record<string, any>>();
    const postId = c.req.param("postId");
    const post = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    if (!post[0]) return c.json({ error: "Not found" }, 404);
    if (post[0].authorId !== user.id && !c.get("isAdmin")) return c.json({ error: "Forbidden" }, 403);

    const [updated] = await db
      .update(postsTable)
      .set({
        ...(content !== undefined ? { content, hashtags: extractHashtags(content) } : {}),
        ...(isPrivate !== undefined ? { isPrivate } : {}),
        updatedAt: new Date(),
      })
      .where(eq(postsTable.id, postId))
      .returning();
    return c.json(await enrichPost(db, updated, user.id));
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// DELETE /posts/:postId  — soft delete
router.delete("/posts/:postId", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const isAdmin = c.get("isAdmin"); const canSeeDeleted = c.get("canSeeDeleted");
    const user = await checkOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const postId = c.req.param("postId");
    const post = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    if (!post[0]) return c.json({ error: "Not found" }, 404);
    if (post[0].authorId !== user.id && !isAdmin) return c.json({ error: "Forbidden" }, 403);

    // Soft delete
    await db
      .update(postsTable)
      .set({ deletedAt: new Date() })
      .where(eq(postsTable.id, postId));

    await db
      .update(usersTable)
      .set({ postsCount: sql`GREATEST(${usersTable.postsCount} - 1, 0)` })
      .where(eq(usersTable.id, post[0].authorId));
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// POST /posts/:postId/save
router.post("/posts/:postId/save", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await checkOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    await db
      .insert(savedPostsTable)
      .values({ userId: user.id, postId: c.req.param("postId") })
      .onConflictDoNothing();
    return c.json({ saved: true });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// DELETE /posts/:postId/save
router.delete("/posts/:postId/save", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await checkOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    await db
      .delete(savedPostsTable)
      .where(
        and(
          eq(savedPostsTable.userId, user.id),
          eq(savedPostsTable.postId, c.req.param("postId")),
        ),
      );
    return c.json({ saved: false });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// GET /users/:username/saved-posts
router.get("/users/:username/saved-posts", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const isAdmin = c.get("isAdmin"); const canSeeDeleted = c.get("canSeeDeleted");
    const user = await checkOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const targetUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, c.req.param("username").toLowerCase()))
      .limit(1);
    if (!targetUser[0]) return c.json({ error: "User not found" }, 404);

    const targetId = targetUser[0].id;
    if (targetId !== user.id && !isAdmin) {
      const settings = await db
        .select()
        .from(userSettingsTable)
        .where(eq(userSettingsTable.userId, targetId))
        .limit(1);
      if (!settings[0]?.savedPostsPublic)
        return c.json({ error: "This user's favorites are private" }, 403);
    }

    const limit = Math.min(Number(c.req.query("limit")) || 20, 50);
    const conditions: any[] = [eq(savedPostsTable.userId, targetId)];
    if (!canSeeDeleted) conditions.push(isNull(postsTable.deletedAt));

    const saved = await db
      .select({ post: postsTable })
      .from(savedPostsTable)
      .innerJoin(postsTable, eq(savedPostsTable.postId, postsTable.id))
      .where(and(...conditions))
      .orderBy(desc(savedPostsTable.savedAt))
      .limit(limit);
    const items = await Promise.all(saved.map((s) => enrichPost(db, s.post, user.id)));
    return c.json({ items, nextCursor: null });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// GET /users/:username/posts
router.get("/users/:username/posts", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const isAdmin = c.get("isAdmin"); const canSeeDeleted = c.get("canSeeDeleted");
    const limit = Math.min(Number(c.req.query("limit")) || 20, 50);
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, c.req.param("username").toLowerCase()))
      .limit(1);
    if (!users[0]) return c.json({ error: "Not found" }, 404);

    const isOwner = users[0].id === clerkId;
    const conditions: any[] = [eq(postsTable.authorId, users[0].id)];
    if (!isOwner && !isAdmin) conditions.push(eq(postsTable.isPrivate, false));
    if (!canSeeDeleted) conditions.push(isNull(postsTable.deletedAt));

    const posts = await db
      .select()
      .from(postsTable)
      .where(and(...conditions))
      .orderBy(desc(postsTable.createdAt))
      .limit(limit);
    const items = await Promise.all(posts.map((p) => enrichPost(db, p, clerkId)));
    return c.json({ items, nextCursor: null });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

export default router;
