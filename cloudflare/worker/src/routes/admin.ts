/**
 * مسارات المشرف — تتطلب مفتاح X-Admin-Key الصحيح
 *
 * GET /api/admin/deleted/posts      — كل المنشورات المحذوفة
 * GET /api/admin/deleted/stories    — كل القصص المحذوفة
 * GET /api/admin/deleted/groups     — كل المجموعات المحذوفة
 * GET /api/admin/deleted/comments   — كل التعليقات المحذوفة
 * POST /api/admin/restore/posts/:id   — استعادة منشور محذوف
 * POST /api/admin/restore/stories/:id — استعادة قصة محذوفة
 * POST /api/admin/restore/groups/:id  — استعادة مجموعة محذوفة
 * POST /api/admin/restore/comments/:id — استعادة تعليق محذوف
 */

import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { createDb } from "../db";
import { isAdminKey } from "../auth";
import { enrichPost } from "../helpers";
import { postsTable, storiesTable, groupsTable, commentsTable, usersTable } from "../schema";
import { isNotNull, desc, eq } from "drizzle-orm";

const router = new Hono<HonoEnv>();

// Middleware: يتحقق من مفتاح المشرف لكل مسارات /admin/*
router.use("/admin/*", async (c, next) => {
  const key = c.req.header("X-Admin-Key");
  if (!isAdminKey(key)) {
    return c.json({ error: "Forbidden — invalid admin key" }, 403);
  }
  await next();
});

// ── GET /admin/deleted/posts ─────────────────────────────────────────────────
router.get("/admin/deleted/posts", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const limit = Math.min(Number(c.req.query("limit")) || 50, 100);
    const posts = await db
      .select()
      .from(postsTable)
      .where(isNotNull(postsTable.deletedAt))
      .orderBy(desc(postsTable.deletedAt))
      .limit(limit);
    const items = await Promise.all(posts.map((p) => enrichPost(db, p, "admin")));
    return c.json({ items, total: items.length });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// ── GET /admin/deleted/stories ───────────────────────────────────────────────
router.get("/admin/deleted/stories", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const limit = Math.min(Number(c.req.query("limit")) || 50, 100);
    const stories = await db
      .select()
      .from(storiesTable)
      .where(isNotNull((storiesTable as any).deletedAt))
      .orderBy(desc((storiesTable as any).deletedAt))
      .limit(limit);

    // إضافة بيانات صاحب القصة
    const items = await Promise.all(
      stories.map(async (s) => {
        const author = await db
          .select({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl })
          .from(usersTable)
          .where(eq(usersTable.id, s.authorId))
          .limit(1);
        return {
          id: s.id,
          authorId: s.authorId,
          author: author[0] ?? null,
          mediaUrl: s.mediaUrl,
          mediaType: s.mediaType,
          expiresAt: s.expiresAt.toISOString(),
          deletedAt: (s as any).deletedAt ? new Date((s as any).deletedAt).toISOString() : null,
          createdAt: s.createdAt.toISOString(),
        };
      }),
    );
    return c.json({ items, total: items.length });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// ── GET /admin/deleted/groups ────────────────────────────────────────────────
router.get("/admin/deleted/groups", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const limit = Math.min(Number(c.req.query("limit")) || 50, 100);
    const groups = await db
      .select()
      .from(groupsTable)
      .where(isNotNull(groupsTable.deletedAt))
      .orderBy(desc(groupsTable.deletedAt))
      .limit(limit);

    const items = await Promise.all(
      groups.map(async (g) => {
        const owner = await db
          .select({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl })
          .from(usersTable)
          .where(eq(usersTable.id, g.ownerId))
          .limit(1);
        return {
          id: g.id,
          name: g.name,
          description: g.description ?? null,
          avatarUrl: g.avatarUrl ?? null,
          ownerId: g.ownerId,
          owner: owner[0] ?? null,
          membersCount: g.membersCount,
          deletedAt: g.deletedAt ? g.deletedAt.toISOString() : null,
          createdAt: g.createdAt.toISOString(),
        };
      }),
    );
    return c.json({ items, total: items.length });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// ── GET /admin/deleted/comments ──────────────────────────────────────────────
router.get("/admin/deleted/comments", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const limit = Math.min(Number(c.req.query("limit")) || 50, 100);
    const comments = await db
      .select()
      .from(commentsTable)
      .where(isNotNull(commentsTable.deletedAt))
      .orderBy(desc(commentsTable.deletedAt))
      .limit(limit);

    const items = await Promise.all(
      comments.map(async (cm) => {
        const author = await db
          .select({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl })
          .from(usersTable)
          .where(eq(usersTable.id, cm.authorId))
          .limit(1);
        return {
          id: cm.id,
          postId: cm.postId,
          authorId: cm.authorId,
          author: author[0] ?? null,
          content: cm.content,
          parentId: cm.parentId ?? null,
          deletedAt: cm.deletedAt ? cm.deletedAt.toISOString() : null,
          createdAt: cm.createdAt.toISOString(),
          updatedAt: cm.updatedAt?.toISOString() ?? null,
        };
      }),
    );
    return c.json({ items, total: items.length });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// ── POST /admin/restore/posts/:id ────────────────────────────────────────────
router.post("/admin/restore/posts/:id", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const [restored] = await db
      .update(postsTable)
      .set({ deletedAt: null })
      .where(eq(postsTable.id, c.req.param("id")))
      .returning();
    if (!restored) return c.json({ error: "Not found" }, 404);
    return c.json({ success: true, id: restored.id });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// ── POST /admin/restore/stories/:id ─────────────────────────────────────────
router.post("/admin/restore/stories/:id", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const [restored] = await db
      .update(storiesTable)
      .set({ deletedAt: null } as any)
      .where(eq(storiesTable.id, c.req.param("id")))
      .returning();
    if (!restored) return c.json({ error: "Not found" }, 404);
    return c.json({ success: true, id: restored.id });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// ── POST /admin/restore/groups/:id ──────────────────────────────────────────
router.post("/admin/restore/groups/:id", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const [restored] = await db
      .update(groupsTable)
      .set({ deletedAt: null })
      .where(eq(groupsTable.id, c.req.param("id")))
      .returning();
    if (!restored) return c.json({ error: "Not found" }, 404);
    return c.json({ success: true, id: restored.id });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// ── POST /admin/restore/comments/:id ────────────────────────────────────────
router.post("/admin/restore/comments/:id", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const [restored] = await db
      .update(commentsTable)
      .set({ deletedAt: null })
      .where(eq(commentsTable.id, c.req.param("id")))
      .returning();
    if (!restored) return c.json({ error: "Not found" }, 404);
    return c.json({ success: true, id: restored.id });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

export default router;
