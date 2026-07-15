import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { createDb } from "../db";
import type { DB } from "../db";
import { getOrCreateUser } from "../auth";
import { getUserProfile, enrichPost, notifyMentions, extractHashtags } from "../helpers";
import { groupsTable, groupMembersTable, usersTable, postsTable } from "../schema";
import { eq, and, desc, lt, ilike, sql } from "drizzle-orm";

const router = new Hono<HonoEnv>();

async function requireOnboarding(db: DB, clerkId: string) {
  const user = await getOrCreateUser(db, clerkId);
  return user.onboardingComplete ? user : null;
}

async function enrichGroup(db: DB, group: typeof groupsTable.$inferSelect, viewerId?: string) {
  const owner = await getUserProfile(db, group.ownerId, viewerId);
  let isMember = false;
  if (viewerId) {
    const membership = await db
      .select()
      .from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, group.id), eq(groupMembersTable.userId, viewerId)))
      .limit(1);
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

// GET /groups
router.get("/groups", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const q = c.req.query("q") || "";
    const limit = Math.min(Number(c.req.query("limit")) || 20, 50);
    const cursor = c.req.query("cursor");

    const conditions: any[] = [];
    if (q.trim()) conditions.push(ilike(groupsTable.name, `%${q}%`));
    if (cursor) conditions.push(lt(groupsTable.createdAt, new Date(cursor)));

    const groups = await db
      .select()
      .from(groupsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(groupsTable.createdAt))
      .limit(limit + 1);

    const hasMore = groups.length > limit;
    const items = await Promise.all(groups.slice(0, limit).map((g) => enrichGroup(db, g, user.id)));
    const nextCursor = hasMore ? groups[limit - 1].createdAt.toISOString() : null;
    return c.json({ items, nextCursor });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// POST /groups
router.post("/groups", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const { name, description, avatarUrl } = await c.req.json<Record<string, any>>();
    if (!name || !String(name).trim())
      return c.json({ error: "Group name is required" }, 400);

    const groupId = crypto.randomUUID();
    const [group] = await db
      .insert(groupsTable)
      .values({
        id: groupId,
        name: String(name).trim(),
        description: description || null,
        avatarUrl: avatarUrl || null,
        ownerId: user.id,
        membersCount: 1,
      })
      .returning();
    await db.insert(groupMembersTable).values({ groupId, userId: user.id, role: "owner" });
    return c.json(await enrichGroup(db, group, user.id), 201);
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// GET /groups/mine
router.get("/groups/mine", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const limit = Math.min(Number(c.req.query("limit")) || 20, 50);
    const memberships = await db
      .select({ group: groupsTable })
      .from(groupMembersTable)
      .innerJoin(groupsTable, eq(groupMembersTable.groupId, groupsTable.id))
      .where(eq(groupMembersTable.userId, user.id))
      .orderBy(desc(groupMembersTable.joinedAt))
      .limit(limit);
    const items = await Promise.all(memberships.map((m) => enrichGroup(db, m.group, user.id)));
    return c.json({ items, nextCursor: null });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// GET /groups/:groupId
router.get("/groups/:groupId", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const group = await db
      .select()
      .from(groupsTable)
      .where(eq(groupsTable.id, c.req.param("groupId")))
      .limit(1);
    if (!group[0]) return c.json({ error: "Not found" }, 404);
    return c.json(await enrichGroup(db, group[0], user.id));
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// PATCH /groups/:groupId
router.patch("/groups/:groupId", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const groupId = c.req.param("groupId");
    const { name, description, avatarUrl } = await c.req.json<Record<string, any>>();
    const group = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
    if (!group[0]) return c.json({ error: "Not found" }, 404);
    if (group[0].ownerId !== user.id) return c.json({ error: "Forbidden" }, 403);
    if (name !== undefined && !String(name).trim())
      return c.json({ error: "Group name is required" }, 400);

    const [updated] = await db
      .update(groupsTable)
      .set({
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
      })
      .where(eq(groupsTable.id, groupId))
      .returning();
    return c.json(await enrichGroup(db, updated, user.id));
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// DELETE /groups/:groupId
router.delete("/groups/:groupId", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const groupId = c.req.param("groupId");
    const group = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
    if (!group[0]) return c.json({ error: "Not found" }, 404);
    if (group[0].ownerId !== user.id) return c.json({ error: "Forbidden" }, 403);
    await db.delete(groupsTable).where(eq(groupsTable.id, groupId));
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// GET /groups/:groupId/posts
router.get("/groups/:groupId/posts", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const groupId = c.req.param("groupId");
    const limit = Math.min(Number(c.req.query("limit")) || 20, 50);
    const cursor = c.req.query("cursor");

    const group = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
    if (!group[0]) return c.json({ error: "Not found" }, 404);

    const conditions: any[] = [eq(postsTable.groupId, groupId)];
    if (cursor) conditions.push(lt(postsTable.createdAt, new Date(cursor)));

    const posts = await db
      .select()
      .from(postsTable)
      .where(and(...conditions))
      .orderBy(desc(postsTable.createdAt))
      .limit(limit + 1);

    const hasMore = posts.length > limit;
    const items = await Promise.all(posts.slice(0, limit).map((p) => enrichPost(db, p, user.id)));
    return c.json({ items, nextCursor: hasMore ? posts[limit - 1].createdAt.toISOString() : null });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// POST /groups/:groupId/posts
router.post("/groups/:groupId/posts", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const groupId = c.req.param("groupId");
    const { content, mediaUrls, mediaType } = await c.req.json<Record<string, any>>();

    const group = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
    if (!group[0]) return c.json({ error: "Not found" }, 404);

    const membership = await db
      .select()
      .from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, user.id)))
      .limit(1);
    if (!membership[0]) return c.json({ error: "You must join the group to post in it" }, 403);

    const [post] = await db
      .insert(postsTable)
      .values({
        id: crypto.randomUUID(),
        authorId: user.id,
        groupId,
        content: content || null,
        mediaUrls: mediaUrls || [],
        mediaType: mediaType || null,
        hashtags: extractHashtags(content),
        isPrivate: false,
      })
      .returning();
    await db
      .update(usersTable)
      .set({ postsCount: sql`${usersTable.postsCount} + 1` })
      .where(eq(usersTable.id, user.id));
    await notifyMentions(db, { content, actorId: user.id, postId: post.id });
    return c.json(await enrichPost(db, post, user.id), 201);
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// POST /groups/:groupId/join
router.post("/groups/:groupId/join", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const groupId = c.req.param("groupId");
    const group = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
    if (!group[0]) return c.json({ error: "Not found" }, 404);

    const existing = await db
      .select()
      .from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, user.id)))
      .limit(1);
    if (!existing[0]) {
      await db
        .insert(groupMembersTable)
        .values({ groupId, userId: user.id, role: "member" });
      await db
        .update(groupsTable)
        .set({ membersCount: sql`${groupsTable.membersCount} + 1` })
        .where(eq(groupsTable.id, groupId));
    }
    const updated = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
    return c.json({ isMember: true, membersCount: updated[0].membersCount });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// DELETE /groups/:groupId/join (leave)
router.delete("/groups/:groupId/join", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const groupId = c.req.param("groupId");
    const group = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
    if (!group[0]) return c.json({ error: "Not found" }, 404);
    if (group[0].ownerId === user.id) return c.json({ error: "Owner cannot leave the group" }, 400);

    const existing = await db
      .select()
      .from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, user.id)))
      .limit(1);
    if (existing[0]) {
      await db
        .delete(groupMembersTable)
        .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, user.id)));
      await db
        .update(groupsTable)
        .set({ membersCount: sql`GREATEST(${groupsTable.membersCount} - 1, 0)` })
        .where(eq(groupsTable.id, groupId));
    }
    const updated = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
    return c.json({ isMember: false, membersCount: updated[0].membersCount });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// GET /groups/:groupId/members
router.get("/groups/:groupId/members", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const groupId = c.req.param("groupId");
    const limit = Math.min(Number(c.req.query("limit")) || 30, 50);
    const members = await db
      .select({ user: usersTable })
      .from(groupMembersTable)
      .innerJoin(usersTable, eq(groupMembersTable.userId, usersTable.id))
      .where(eq(groupMembersTable.groupId, groupId))
      .orderBy(desc(groupMembersTable.joinedAt))
      .limit(limit);
    const items = await Promise.all(members.map((m) => getUserProfile(db, m.user.id, user.id)));
    return c.json({ items: items.filter(Boolean), nextCursor: null });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

export default router;
