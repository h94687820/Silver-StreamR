import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { createDb } from "../db";
import { getOrCreateUser } from "../auth";
import { getUserProfile, enrichPost } from "../helpers";
import { usersTable, postsTable } from "../schema";
import { ilike, or, eq, and, desc } from "drizzle-orm";

const router = new Hono<HonoEnv>();

async function requireOnboarding(db: ReturnType<typeof createDb>, clerkId: string) {
  const user = await getOrCreateUser(db, clerkId);
  return user.onboardingComplete ? user : null;
}

// GET /search/users
router.get("/search/users", async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const q = c.req.query("q") || "";
    const limit = Math.min(Number(c.req.query("limit")) || 20, 30);
    if (!q.trim()) return c.json([]);

    const users = await db
      .select()
      .from(usersTable)
      .where(or(ilike(usersTable.username, `%${q}%`), ilike(usersTable.displayName, `%${q}%`))!)
      .limit(limit);
    const profiles = await Promise.all(users.map((u) => getUserProfile(db, u.id, user.id)));
    return c.json(profiles.filter(Boolean));
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// GET /search/posts
router.get("/search/posts", async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const q = c.req.query("q") || "";
    const limit = Math.min(Number(c.req.query("limit")) || 20, 30);
    if (!q.trim()) return c.json({ items: [], nextCursor: null });

    const posts = await db
      .select()
      .from(postsTable)
      .where(and(ilike(postsTable.content, `%${q}%`), eq(postsTable.isPrivate, false)))
      .orderBy(desc(postsTable.createdAt))
      .limit(limit);
    const items = await Promise.all(posts.map((p) => enrichPost(db, p, user.id)));
    return c.json({ items, nextCursor: null });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// GET /search/videos
router.get("/search/videos", async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const q = c.req.query("q") || "";
    const limit = Math.min(Number(c.req.query("limit")) || 20, 30);
    if (!q.trim()) return c.json({ items: [], nextCursor: null });

    const posts = await db
      .select()
      .from(postsTable)
      .where(
        and(
          ilike(postsTable.content, `%${q}%`),
          eq(postsTable.isPrivate, false),
          eq(postsTable.mediaType, "video"),
        ),
      )
      .orderBy(desc(postsTable.createdAt))
      .limit(limit);
    const items = await Promise.all(posts.map((p) => enrichPost(db, p, user.id)));
    return c.json({ items, nextCursor: null });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

export default router;
