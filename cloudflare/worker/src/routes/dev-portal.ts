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
import { desc, isNotNull, isNull, eq, sql, and } from "drizzle-orm";

const router = new Hono<HonoEnv>();

// ── Auth middleware ──────────────────────────────────────────────────────────
// يعتمد على الـ context الذي عيَّنه main middleware في index.ts:
//   isAdmin=true          → وصول كامل لكل نقاط البوابة
//   isReportsViewer=true  → /reports فقط (مفلتر تلقائياً بـ reportsMode)
//   isVideosViewer=true   → /videos فقط
router.use("*", async (c, next) => {
  const path = new URL(c.req.url).pathname.replace(/^\/api/, ""); // normalize /api/x → /x

  // مشرف كامل — DEV_PORTAL_KEY أو X-Admin-Key
  if (c.get("isAdmin")) { await next(); return; }

  // مفتاح الفيديوهات — /videos فقط
  if (c.get("isVideosViewer") && path === "/videos") { await next(); return; }

  // مفتاح البلاغات — /reports فقط (المفلتر سيُطبَّق داخل الـ route)
  if (c.get("isReportsViewer") && path === "/reports") { await next(); return; }

  return c.json({ error: "Forbidden" }, 403);
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

// ── GET /reports — البلاغات مع دعم ?mode=general|specific ──────────────────
// - isAdmin=true          → يرى الكل ويمكنه فلترة بـ ?mode=
// - isReportsViewer=true  → مقيَّد تلقائياً بـ reportsMode من context (لا يمكنه تجاوزه)
router.get("/reports", async (c) => {
  const db = createDb(c.env.DB);
  const { page, limit, offset } = getPagination(c.req.query());

  // إذا كان مشاهد بلاغات → mode مقيَّد من المفتاح، لا من query param
  const mode = c.get("isReportsViewer")
    ? c.get("reportsMode")          // 'specific' | 'general'
    : (c.req.query("mode") ?? "");  // admin: يختار

  const condition = mode ? eq(reportsTable.mode, mode) : undefined;

  const [rows, countRow] = await Promise.all([
    db
      .select()
      .from(reportsTable)
      .where(condition)
      .orderBy(desc(reportsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(reportsTable).where(condition),
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

// ── GET /deleted/images — الصور المحذوفة ────────────────────────────────────
router.get("/deleted/images", async (c) => {
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
      .where(sql`${postsTable.deletedAt} IS NOT NULL AND ${postsTable.mediaType} = 'image'`)
      .orderBy(desc(postsTable.deletedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(postsTable)
      .where(sql`${postsTable.deletedAt} IS NOT NULL AND ${postsTable.mediaType} = 'image'`),
  ]);

  return c.json(paginated(rows, Number(countRow[0]?.count ?? 0), page, limit));
});

// ── GET /deleted/groups — المجموعات المحذوفة ────────────────────────────────
router.get("/deleted/groups", async (c) => {
  const db = createDb(c.env.DB);
  const { page, limit, offset } = getPagination(c.req.query());

  const [rows, countRow] = await Promise.all([
    db
      .select({
        id: groupsTable.id,
        name: groupsTable.name,
        description: groupsTable.description,
        avatarUrl: groupsTable.avatarUrl,
        ownerId: groupsTable.ownerId,
        membersCount: groupsTable.membersCount,
        deletedAt: groupsTable.deletedAt,
        createdAt: groupsTable.createdAt,
      })
      .from(groupsTable)
      .where(isNotNull(groupsTable.deletedAt))
      .orderBy(desc(groupsTable.deletedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(groupsTable)
      .where(isNotNull(groupsTable.deletedAt)),
  ]);

  return c.json(paginated(rows, Number(countRow[0]?.count ?? 0), page, limit));
});

// ── GET /deleted/accounts — الحسابات المحذوفة ───────────────────────────────
// الحسابات تُحذف حذفاً فعلياً عبر Cascade (لا يوجد soft-delete للمستخدمين)
router.get("/deleted/accounts", async (c) => {
  return c.json({ data: [], total: 0, page: 1, limit: 20, note: "Accounts are hard-deleted via Clerk cascade; no soft-delete record exists." });
});

// ── GET /stats — إحصائيات المنصة ────────────────────────────────────────────
router.get("/stats", async (c) => {
  const db = createDb(c.env.DB);

  const [
    usersRow, postsRow, videosRow, imagesRow,
    storiesRow, groupsRow, commentsRow, reactionsRow, reportsRow,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(usersTable),
    db.select({ count: sql<number>`count(*)` }).from(postsTable).where(isNull(postsTable.deletedAt)),
    db.select({ count: sql<number>`count(*)` }).from(postsTable).where(sql`${postsTable.deletedAt} IS NULL AND ${postsTable.mediaType} = 'video'`),
    db.select({ count: sql<number>`count(*)` }).from(postsTable).where(sql`${postsTable.deletedAt} IS NULL AND ${postsTable.mediaType} = 'image'`),
    db.select({ count: sql<number>`count(*)` }).from(storiesTable),
    db.select({ count: sql<number>`count(*)` }).from(groupsTable).where(isNull(groupsTable.deletedAt)),
    db.select({ count: sql<number>`count(*)` }).from(commentsTable).where(isNull(commentsTable.deletedAt)),
    db.select({ count: sql<number>`count(*)` }).from(reactionsTable),
    db.select({ count: sql<number>`count(*)` }).from(reportsTable),
  ]);

  return c.json({
    users:     Number(usersRow[0]?.count     ?? 0),
    posts:     Number(postsRow[0]?.count     ?? 0),
    videos:    Number(videosRow[0]?.count    ?? 0),
    images:    Number(imagesRow[0]?.count    ?? 0),
    stories:   Number(storiesRow[0]?.count   ?? 0),
    groups:    Number(groupsRow[0]?.count    ?? 0),
    comments:  Number(commentsRow[0]?.count  ?? 0),
    reactions: Number(reactionsRow[0]?.count ?? 0),
    reports:   Number(reportsRow[0]?.count   ?? 0),
  });
});

// ── GET /suspicious-behavior — المستخدمون الأكثر إبلاغاً ────────────────────
router.get("/suspicious-behavior", async (c) => {
  const db = createDb(c.env.DB);
  const { page, limit, offset } = getPagination(c.req.query());

  const rows = await db
    .select({
      targetId:       reportsTable.targetId,
      targetUsername: reportsTable.targetUsername,
      reportCount:    sql<number>`cast(count(*) as int)`,
      latestReport:   sql<number>`max(${reportsTable.createdAt})`,
    })
    .from(reportsTable)
    .where(sql`${reportsTable.targetType} = 'user' AND ${reportsTable.targetId} != ''`)
    .groupBy(reportsTable.targetId, reportsTable.targetUsername)
    .having(sql`count(*) >= 1`)
    .orderBy(desc(sql`count(*)`))
    .limit(limit)
    .offset(offset);

  return c.json({ data: rows, total: rows.length, page, limit });
});

export default router;
