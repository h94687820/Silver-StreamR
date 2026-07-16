import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { createDb } from "../db";
import {
  postsTable,
  commentsTable,
  reactionsTable,
  notificationsTable,
  reportsTable,
  usersTable,
  storiesTable,
  groupsTable,
} from "../schema";
import { desc, isNotNull, isNull, eq, sql } from "drizzle-orm";

const DEV_PORTAL_KEY = "pBYRAchfIDFCzi9vOgqezDB0R29gPIbq4OPgoIJNnP0eChpyYHh35dOrJ6GdXk1Y";

const router = new Hono<HonoEnv>();

// ── Auth middleware لجميع مسارات البوابة ────────────────────────────────────
router.use("*", async (c, next) => {
  const key = c.req.header("X-Dev-Portal-Key");
  if (key !== DEV_PORTAL_KEY) {
    return c.json({ error: "Forbidden" }, 403);
  }
  await next();
});

// ── Helper للـ pagination ────────────────────────────────────────────────────
function getPagination(query: Record<string, string | undefined>) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(Math.max(1, Number(query.limit) || 20), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function paginated(data: unknown[], total: number, page: number, limit: number) {
  return { data, total, page, limit };
}

// ── GET /posts ───────────────────────────────────────────────────────────────
router.get("/posts", async (c) => {
  const db = createDb(c.env.DB);
  const { page, limit, offset } = getPagination(c.req.query());

  const [rows, countRow] = await Promise.all([
    db
      .select({
        id: postsTable.id,
        trackingId: postsTable.trackingId,
        authorId: postsTable.authorId,
        groupId: postsTable.groupId,
        content: postsTable.content,
        mediaUrls: postsTable.mediaUrls,
        mediaType: postsTable.mediaType,
        hashtags: postsTable.hashtags,
        isPrivate: postsTable.isPrivate,
        likesCount: postsTable.likesCount,
        dislikesCount: postsTable.dislikesCount,
        commentsCount: postsTable.commentsCount,
        createdAt: postsTable.createdAt,
        updatedAt: postsTable.updatedAt,
      })
      .from(postsTable)
      .where(isNull(postsTable.deletedAt))
      .orderBy(desc(postsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(postsTable)
      .where(isNull(postsTable.deletedAt)),
  ]);

  return c.json(paginated(rows, Number(countRow[0]?.count ?? 0), page, limit));
});

// ── GET /videos ──────────────────────────────────────────────────────────────
router.get("/videos", async (c) => {
  const db = createDb(c.env.DB);
  const { page, limit, offset } = getPagination(c.req.query());

  const [rows, countRow] = await Promise.all([
    db
      .select({
        id: postsTable.id,
        trackingId: postsTable.trackingId,
        authorId: postsTable.authorId,
        groupId: postsTable.groupId,
        content: postsTable.content,
        mediaUrls: postsTable.mediaUrls,
        mediaType: postsTable.mediaType,
        hashtags: postsTable.hashtags,
        isPrivate: postsTable.isPrivate,
        likesCount: postsTable.likesCount,
        dislikesCount: postsTable.dislikesCount,
        commentsCount: postsTable.commentsCount,
        createdAt: postsTable.createdAt,
        updatedAt: postsTable.updatedAt,
      })
      .from(postsTable)
      .where(sql`${postsTable.deletedAt} IS NULL AND ${postsTable.mediaType} = 'video'`)
      .orderBy(desc(postsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(postsTable)
      .where(sql`${postsTable.deletedAt} IS NULL AND ${postsTable.mediaType} = 'video'`),
  ]);

  return c.json(paginated(rows, Number(countRow[0]?.count ?? 0), page, limit));
});

// ── GET /groups ──────────────────────────────────────────────────────────────
router.get("/groups", async (c) => {
  const db = createDb(c.env.DB);
  const { page, limit, offset } = getPagination(c.req.query());

  const [rows, countRow] = await Promise.all([
    db
      .select({
        id: groupsTable.id,
        trackingId: groupsTable.trackingId,
        name: groupsTable.name,
        description: groupsTable.description,
        avatarUrl: groupsTable.avatarUrl,
        ownerId: groupsTable.ownerId,
        membersCount: groupsTable.membersCount,
        createdAt: groupsTable.createdAt,
      })
      .from(groupsTable)
      .orderBy(desc(groupsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(groupsTable),
  ]);

  return c.json(paginated(rows, Number(countRow[0]?.count ?? 0), page, limit));
});

// ── GET /stories ─────────────────────────────────────────────────────────────
router.get("/stories", async (c) => {
  const db = createDb(c.env.DB);
  const { page, limit, offset } = getPagination(c.req.query());

  const [rows, countRow] = await Promise.all([
    db
      .select({
        id: storiesTable.id,
        trackingId: storiesTable.trackingId,
        authorId: storiesTable.authorId,
        mediaUrl: storiesTable.mediaUrl,
        mediaType: storiesTable.mediaType,
        expiresAt: storiesTable.expiresAt,
        createdAt: storiesTable.createdAt,
      })
      .from(storiesTable)
      .orderBy(desc(storiesTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(storiesTable),
  ]);

  return c.json(paginated(rows, Number(countRow[0]?.count ?? 0), page, limit));
});

// ── GET /reports ─────────────────────────────────────────────────────────────
router.get("/reports", async (c) => {
  const db = createDb(c.env.DB);
  const { page, limit, offset } = getPagination(c.req.query());

  const [rows, countRow] = await Promise.all([
    db
      .select()
      .from(reportsTable)
      .orderBy(desc(reportsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(reportsTable),
  ]);

  return c.json(paginated(rows, Number(countRow[0]?.count ?? 0), page, limit));
});

// ── GET /deleted/posts ───────────────────────────────────────────────────────
router.get("/deleted/posts", async (c) => {
  const db = createDb(c.env.DB);
  const { page, limit, offset } = getPagination(c.req.query());

  const [rows, countRow] = await Promise.all([
    db
      .select({
        id: postsTable.id,
        authorId: postsTable.authorId,
        content: postsTable.content,
        mediaUrls: postsTable.mediaUrls,
        mediaType: postsTable.mediaType,
        hashtags: postsTable.hashtags,
        isPrivate: postsTable.isPrivate,
        deletedAt: postsTable.deletedAt,
        createdAt: postsTable.createdAt,
        updatedAt: postsTable.updatedAt,
      })
      .from(postsTable)
      .where(isNotNull(postsTable.deletedAt))
      .orderBy(desc(postsTable.deletedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(postsTable)
      .where(isNotNull(postsTable.deletedAt)),
  ]);

  return c.json(paginated(rows, Number(countRow[0]?.count ?? 0), page, limit));
});

// ── GET /deleted/videos ──────────────────────────────────────────────────────
router.get("/deleted/videos", async (c) => {
  const db = createDb(c.env.DB);
  const { page, limit, offset } = getPagination(c.req.query());

  const [rows, countRow] = await Promise.all([
    db
      .select({
        id: postsTable.id,
        authorId: postsTable.authorId,
        content: postsTable.content,
        mediaUrls: postsTable.mediaUrls,
        mediaType: postsTable.mediaType,
        hashtags: postsTable.hashtags,
        deletedAt: postsTable.deletedAt,
        createdAt: postsTable.createdAt,
        updatedAt: postsTable.updatedAt,
      })
      .from(postsTable)
      .where(
        sql`${postsTable.deletedAt} IS NOT NULL AND ${postsTable.mediaType} = 'video'`,
      )
      .orderBy(desc(postsTable.deletedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(postsTable)
      .where(
        sql`${postsTable.deletedAt} IS NOT NULL AND ${postsTable.mediaType} = 'video'`,
      ),
  ]);

  return c.json(paginated(rows, Number(countRow[0]?.count ?? 0), page, limit));
});

// ── GET /deleted/comments ────────────────────────────────────────────────────
router.get("/deleted/comments", async (c) => {
  const db = createDb(c.env.DB);
  const { page, limit, offset } = getPagination(c.req.query());

  const [rows, countRow] = await Promise.all([
    db
      .select({
        id: commentsTable.id,
        postId: commentsTable.postId,
        authorId: commentsTable.authorId,
        parentId: commentsTable.parentId,
        content: commentsTable.content,
        deletedAt: commentsTable.deletedAt,
        createdAt: commentsTable.createdAt,
        updatedAt: commentsTable.updatedAt,
      })
      .from(commentsTable)
      .where(isNotNull(commentsTable.deletedAt))
      .orderBy(desc(commentsTable.deletedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(commentsTable)
      .where(isNotNull(commentsTable.deletedAt)),
  ]);

  return c.json(paginated(rows, Number(countRow[0]?.count ?? 0), page, limit));
});

// ── GET /reactions ───────────────────────────────────────────────────────────
router.get("/reactions", async (c) => {
  const db = createDb(c.env.DB);
  const { page, limit, offset } = getPagination(c.req.query());

  const [rows, countRow] = await Promise.all([
    db
      .select({
        id: sql<string>`(${reactionsTable.userId} || '_' || ${reactionsTable.postId})`,
        userId: reactionsTable.userId,
        postId: reactionsTable.postId,
        type: reactionsTable.type,
        createdAt: reactionsTable.createdAt,
      })
      .from(reactionsTable)
      .orderBy(desc(reactionsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(reactionsTable),
  ]);

  return c.json(paginated(rows, Number(countRow[0]?.count ?? 0), page, limit));
});

// ── GET /user-behavior ───────────────────────────────────────────────────────
router.get("/user-behavior", async (c) => {
  const db = createDb(c.env.DB);
  const { page, limit, offset } = getPagination(c.req.query());

  const [rows, countRow] = await Promise.all([
    db
      .select({
        id: notificationsTable.id,
        actorId: notificationsTable.actorId,
        recipientId: notificationsTable.recipientId,
        type: notificationsTable.type,
        postId: notificationsTable.postId,
        commentId: notificationsTable.commentId,
        isRead: notificationsTable.isRead,
        createdAt: notificationsTable.createdAt,
      })
      .from(notificationsTable)
      .orderBy(desc(notificationsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(notificationsTable),
  ]);

  return c.json(paginated(rows, Number(countRow[0]?.count ?? 0), page, limit));
});

export default router;
