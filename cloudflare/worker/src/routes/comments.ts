import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { createDb } from "../db";
import { getOrCreateUser } from "../auth";
import { getUserProfile, notifyMentions } from "../helpers";
import { commentsTable, postsTable, notificationsTable } from "../schema";
import { eq, and, isNull, inArray, sql } from "drizzle-orm";

const router = new Hono<HonoEnv>();

// مفاتيح الخدمة — تتجاوز onboarding بدون لمس قاعدة البيانات
const SERVICE_KEYS = new Set(["admin", "posts-viewer", "videos-viewer", "stories-viewer", "groups-viewer", "delete-viewer"]);

async function requireOnboarding(db: ReturnType<typeof createDb>, clerkId: string) {
  if (SERVICE_KEYS.has(clerkId)) return { id: clerkId, onboardingComplete: true, acceptedTerms: true } as any;
  const user = await getOrCreateUser(db, clerkId);
  return user.onboardingComplete ? user : null;
}

/** مفاتيح الخدمة للقراءة فقط — ترفض عمليات الكتابة */
function isReadOnlyServiceKey(clerkId: string): boolean {
  return SERVICE_KEYS.has(clerkId) && clerkId !== "admin";
}

// GET /posts/:postId/comments
router.get("/posts/:postId/comments", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const isAdmin = c.get("isAdmin"); const canSeeDeleted = c.get("canSeeDeleted");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const postId = c.req.param("postId");
    const conditions: any[] = [eq(commentsTable.postId, postId), isNull(commentsTable.parentId)];
    if (!canSeeDeleted) conditions.push(isNull(commentsTable.deletedAt));

    const comments = await db
      .select()
      .from(commentsTable)
      .where(and(...conditions))
      .orderBy(commentsTable.createdAt);

    if (comments.length === 0) return c.json({ items: [], nextCursor: null });

    const replyCounts = await db
      .select({ parentId: commentsTable.parentId, count: sql<number>`cast(count(*) as int)` })
      .from(commentsTable)
      .where(inArray(commentsTable.parentId, comments.map((c) => c.id)))
      .groupBy(commentsTable.parentId);

    const replyCountMap = new Map(replyCounts.map((r) => [r.parentId!, r.count]));

    const enriched = await Promise.all(
      comments.map(async (cm) => ({
        id: cm.id,
        postId: cm.postId,
        authorId: cm.authorId,
        author: await getUserProfile(db, cm.authorId, user.id),
        content: cm.content,
        parentId: null,
        repliesCount: replyCountMap.get(cm.id) ?? 0,
        deletedAt: cm.deletedAt ? cm.deletedAt.toISOString() : null,
        createdAt: cm.createdAt.toISOString(),
        updatedAt: cm.updatedAt?.toISOString() ?? null,
      })),
    );

    return c.json({ items: enriched, nextCursor: null });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// POST /posts/:postId/comments
router.post("/posts/:postId/comments", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    if (isReadOnlyServiceKey(clerkId)) return c.json({ error: "Forbidden" }, 403);
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const postId = c.req.param("postId");
    const { content } = await c.req.json<{ content?: string }>();
    if (!content?.trim()) return c.json({ error: "content required" }, 400);

    const post = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    if (!post[0]) return c.json({ error: "Post not found" }, 404);

    const id = crypto.randomUUID();
    await db.insert(commentsTable).values({ id, postId, authorId: user.id, content });
    await db
      .update(postsTable)
      .set({ commentsCount: sql`${postsTable.commentsCount} + 1` })
      .where(eq(postsTable.id, postId));

    await db.insert(notificationsTable).values({
      id: crypto.randomUUID(),
      recipientId: post[0].authorId,
      actorId: user.id,
      type: "comment",
      postId,
      commentId: id,
    });

    await notifyMentions(db, { content, actorId: user.id, postId, commentId: id });

    const author = await getUserProfile(db, user.id, user.id);
    return c.json(
      {
        id,
        postId,
        authorId: user.id,
        author,
        content,
        parentId: null,
        repliesCount: 0,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: null,
      },
      201,
    );
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// GET /comments/:commentId/replies
router.get("/comments/:commentId/replies", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const isAdmin = c.get("isAdmin"); const canSeeDeleted = c.get("canSeeDeleted");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const commentId = c.req.param("commentId");
    const conditions: any[] = [eq(commentsTable.parentId, commentId)];
    if (!canSeeDeleted) conditions.push(isNull(commentsTable.deletedAt));

    const replies = await db
      .select()
      .from(commentsTable)
      .where(and(...conditions))
      .orderBy(commentsTable.createdAt);

    const enriched = await Promise.all(
      replies.map(async (r) => ({
        id: r.id,
        postId: r.postId,
        authorId: r.authorId,
        author: await getUserProfile(db, r.authorId, user.id),
        content: r.content,
        parentId: r.parentId,
        repliesCount: 0,
        deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt?.toISOString() ?? null,
      })),
    );

    return c.json({ items: enriched, nextCursor: null });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// POST /comments/:commentId/replies
router.post("/comments/:commentId/replies", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const parentCommentId = c.req.param("commentId");
    const { content } = await c.req.json<{ content?: string }>();
    if (!content?.trim()) return c.json({ error: "content required" }, 400);

    const parent = await db
      .select()
      .from(commentsTable)
      .where(eq(commentsTable.id, parentCommentId))
      .limit(1);
    if (!parent[0]) return c.json({ error: "Comment not found" }, 404);

    const id = crypto.randomUUID();
    await db.insert(commentsTable).values({
      id,
      postId: parent[0].postId,
      authorId: user.id,
      parentId: parentCommentId,
      content,
    });

    await db.insert(notificationsTable).values({
      id: crypto.randomUUID(),
      recipientId: parent[0].authorId,
      actorId: user.id,
      type: "comment",
      postId: parent[0].postId,
      commentId: id,
    });

    await notifyMentions(db, {
      content,
      actorId: user.id,
      postId: parent[0].postId,
      commentId: id,
    });

    const author = await getUserProfile(db, user.id, user.id);
    return c.json(
      {
        id,
        postId: parent[0].postId,
        authorId: user.id,
        author,
        content,
        parentId: parentCommentId,
        repliesCount: 0,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: null,
      },
      201,
    );
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// PATCH /comments/:commentId
router.patch("/comments/:commentId", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    if (isReadOnlyServiceKey(clerkId)) return c.json({ error: "Forbidden" }, 403);
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const commentId = c.req.param("commentId");
    const { content } = await c.req.json<{ content?: string }>();
    if (!content?.trim()) return c.json({ error: "content required" }, 400);

    const comment = await db
      .select()
      .from(commentsTable)
      .where(eq(commentsTable.id, commentId))
      .limit(1);
    if (!comment[0]) return c.json({ error: "Not found" }, 404);
    if (comment[0].authorId !== user.id && !c.get("isAdmin")) return c.json({ error: "Forbidden" }, 403);

    const [updated] = await db
      .update(commentsTable)
      .set({ content, updatedAt: new Date() })
      .where(eq(commentsTable.id, commentId))
      .returning();

    await notifyMentions(db, {
      content,
      actorId: user.id,
      postId: updated.postId,
      commentId: updated.id,
    });

    const author = await getUserProfile(db, user.id, user.id);
    return c.json({
      id: updated.id,
      postId: updated.postId,
      authorId: updated.authorId,
      author,
      content: updated.content,
      parentId: updated.parentId ?? null,
      repliesCount: 0,
      deletedAt: updated.deletedAt ? updated.deletedAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt?.toISOString() ?? null,
    });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// DELETE /comments/:commentId  — soft delete
router.delete("/comments/:commentId", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const isAdmin = c.get("isAdmin"); const canSeeDeleted = c.get("canSeeDeleted");
    if (isReadOnlyServiceKey(clerkId)) return c.json({ error: "Forbidden" }, 403);
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const commentId = c.req.param("commentId");
    const comment = await db
      .select()
      .from(commentsTable)
      .where(eq(commentsTable.id, commentId))
      .limit(1);
    if (!comment[0]) return c.json({ error: "Not found" }, 404);
    if (comment[0].authorId !== user.id && !isAdmin) return c.json({ error: "Forbidden" }, 403);

    // Soft delete
    await db
      .update(commentsTable)
      .set({ deletedAt: new Date() })
      .where(eq(commentsTable.id, commentId));

    if (!comment[0].parentId) {
      await db
        .update(postsTable)
        .set({ commentsCount: sql`GREATEST(${postsTable.commentsCount} - 1, 0)` })
        .where(eq(postsTable.id, comment[0].postId));
    }

    return c.json({ success: true });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

export default router;
