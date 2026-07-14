import { Router } from "express";
import { db } from "@workspace/db";
import { groupsTable, groupMembersTable, usersTable, postsTable } from "@workspace/db";
import { eq, and, desc, lt, ilike, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireOnboarding } from "../lib/auth";
import { getUserProfile, enrichPost, notifyMentions, extractHashtags } from "../lib/helpers";

const router = Router();

async function enrichGroup(group: typeof groupsTable.$inferSelect, viewerId?: string) {
  const owner = await getUserProfile(group.ownerId, viewerId);
  let isMember = false;
  if (viewerId) {
    const membership = await db.select().from(groupMembersTable).where(
      and(eq(groupMembersTable.groupId, group.id), eq(groupMembersTable.userId, viewerId))
    ).limit(1);
    isMember = membership.length > 0;
  }
  return {
    id: group.id,
    name: group.name,
    description: group.description ?? null,
    avatarUrl: group.avatarUrl ?? null,
    ownerId: group.ownerId,
    owner: owner!,
    membersCount: group.membersCount,
    isMember,
    isOwner: viewerId === group.ownerId,
    createdAt: group.createdAt.toISOString(),
  };
}

// GET /groups (discover public groups)
router.get("/groups", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const q = (req.query.q as string) || "";
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    const conditions = [];
    if (q.trim()) conditions.push(ilike(groupsTable.name, `%${q}%`));
    if (cursor) conditions.push(lt(groupsTable.createdAt, new Date(cursor)));

    const groups = await db.select().from(groupsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(groupsTable.createdAt))
      .limit(limit + 1);

    const hasMore = groups.length > limit;
    const items = await Promise.all(groups.slice(0, limit).map(g => enrichGroup(g, userId)));
    const nextCursor = hasMore ? groups[limit - 1].createdAt.toISOString() : null;
    res.json({ items, nextCursor });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /groups (create)
router.post("/groups", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { name, description, avatarUrl } = req.body;
    if (!name || !String(name).trim()) {
      res.status(400).json({ error: "Group name is required" });
      return;
    }
    const groupId = randomUUID();
    const [group] = await db.insert(groupsTable).values({
      id: groupId,
      name: String(name).trim(),
      description: description || null,
      avatarUrl: avatarUrl || null,
      ownerId: userId,
      membersCount: 1,
    }).returning();
    await db.insert(groupMembersTable).values({ groupId, userId, role: "owner" });
    const enriched = await enrichGroup(group, userId);
    res.status(201).json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /groups/mine (groups I've joined)
router.get("/groups/mine", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const memberships = await db.select({ group: groupsTable }).from(groupMembersTable)
      .innerJoin(groupsTable, eq(groupMembersTable.groupId, groupsTable.id))
      .where(eq(groupMembersTable.userId, userId))
      .orderBy(desc(groupMembersTable.joinedAt))
      .limit(limit);
    const items = await Promise.all(memberships.map(m => enrichGroup(m.group, userId)));
    res.json({ items, nextCursor: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /groups/:groupId
router.get("/groups/:groupId", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const group = await db.select().from(groupsTable).where(eq(groupsTable.id, req.params.groupId)).limit(1);
    if (!group[0]) { res.status(404).json({ error: "Not found" }); return; }
    res.json(await enrichGroup(group[0], userId));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /groups/:groupId (owner only)
router.patch("/groups/:groupId", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { name, description, avatarUrl } = req.body;
    const group = await db.select().from(groupsTable).where(eq(groupsTable.id, req.params.groupId)).limit(1);
    if (!group[0]) { res.status(404).json({ error: "Not found" }); return; }
    if (group[0].ownerId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
    if (name !== undefined && !String(name).trim()) { res.status(400).json({ error: "Group name is required" }); return; }

    const [updated] = await db.update(groupsTable).set({
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
    }).where(eq(groupsTable.id, req.params.groupId)).returning();
    res.json(await enrichGroup(updated, userId));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /groups/:groupId/posts
router.get("/groups/:groupId/posts", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    const group = await db.select().from(groupsTable).where(eq(groupsTable.id, req.params.groupId)).limit(1);
    if (!group[0]) { res.status(404).json({ error: "Not found" }); return; }

    const conditions = [eq(postsTable.groupId, req.params.groupId)];
    if (cursor) conditions.push(lt(postsTable.createdAt, new Date(cursor)));

    const posts = await db.select().from(postsTable)
      .where(and(...conditions))
      .orderBy(desc(postsTable.createdAt))
      .limit(limit + 1);

    const hasMore = posts.length > limit;
    const items = await Promise.all(posts.slice(0, limit).map(p => enrichPost(p, userId)));
    const nextCursor = hasMore ? posts[limit - 1].createdAt.toISOString() : null;
    res.json({ items, nextCursor });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /groups/:groupId/posts (members only)
router.post("/groups/:groupId/posts", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { content, mediaUrls, mediaType } = req.body;

    const group = await db.select().from(groupsTable).where(eq(groupsTable.id, req.params.groupId)).limit(1);
    if (!group[0]) { res.status(404).json({ error: "Not found" }); return; }

    const membership = await db.select().from(groupMembersTable).where(
      and(eq(groupMembersTable.groupId, req.params.groupId), eq(groupMembersTable.userId, userId))
    ).limit(1);
    if (!membership[0]) { res.status(403).json({ error: "You must join the group to post in it" }); return; }

    const [post] = await db.insert(postsTable).values({
      id: randomUUID(),
      authorId: userId,
      groupId: req.params.groupId,
      content: content || null,
      mediaUrls: mediaUrls || [],
      mediaType: mediaType || null,
      hashtags: extractHashtags(content),
      isPrivate: false,
    }).returning();
    await db.update(usersTable).set({ postsCount: sql`${usersTable.postsCount} + 1` }).where(eq(usersTable.id, userId));
    await notifyMentions({ content, actorId: userId, postId: post.id });
    res.status(201).json(await enrichPost(post, userId));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /groups/:groupId (owner only)
router.delete("/groups/:groupId", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const group = await db.select().from(groupsTable).where(eq(groupsTable.id, req.params.groupId)).limit(1);
    if (!group[0]) { res.status(404).json({ error: "Not found" }); return; }
    if (group[0].ownerId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(groupsTable).where(eq(groupsTable.id, req.params.groupId));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /groups/:groupId/join
router.post("/groups/:groupId/join", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const group = await db.select().from(groupsTable).where(eq(groupsTable.id, req.params.groupId)).limit(1);
    if (!group[0]) { res.status(404).json({ error: "Not found" }); return; }
    const existing = await db.select().from(groupMembersTable).where(
      and(eq(groupMembersTable.groupId, req.params.groupId), eq(groupMembersTable.userId, userId))
    ).limit(1);
    if (!existing[0]) {
      await db.insert(groupMembersTable).values({ groupId: req.params.groupId, userId, role: "member" });
      await db.update(groupsTable).set({ membersCount: sql`${groupsTable.membersCount} + 1` }).where(eq(groupsTable.id, req.params.groupId));
    }
    const updated = await db.select().from(groupsTable).where(eq(groupsTable.id, req.params.groupId)).limit(1);
    res.json({ isMember: true, membersCount: updated[0].membersCount });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /groups/:groupId/join (leave)
router.delete("/groups/:groupId/join", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const group = await db.select().from(groupsTable).where(eq(groupsTable.id, req.params.groupId)).limit(1);
    if (!group[0]) { res.status(404).json({ error: "Not found" }); return; }
    if (group[0].ownerId === userId) { res.status(400).json({ error: "Owner cannot leave the group" }); return; }
    const existing = await db.select().from(groupMembersTable).where(
      and(eq(groupMembersTable.groupId, req.params.groupId), eq(groupMembersTable.userId, userId))
    ).limit(1);
    if (existing[0]) {
      await db.delete(groupMembersTable).where(
        and(eq(groupMembersTable.groupId, req.params.groupId), eq(groupMembersTable.userId, userId))
      );
      await db.update(groupsTable).set({ membersCount: sql`GREATEST(${groupsTable.membersCount} - 1, 0)` }).where(eq(groupsTable.id, req.params.groupId));
    }
    const updated = await db.select().from(groupsTable).where(eq(groupsTable.id, req.params.groupId)).limit(1);
    res.json({ isMember: false, membersCount: updated[0].membersCount });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /groups/:groupId/members
router.get("/groups/:groupId/members", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const limit = Math.min(Number(req.query.limit) || 30, 50);
    const members = await db.select({ user: usersTable }).from(groupMembersTable)
      .innerJoin(usersTable, eq(groupMembersTable.userId, usersTable.id))
      .where(eq(groupMembersTable.groupId, req.params.groupId))
      .orderBy(desc(groupMembersTable.joinedAt))
      .limit(limit);
    const items = await Promise.all(members.map(m => getUserProfile(m.user.id, userId)));
    res.json({ items: items.filter(Boolean), nextCursor: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
