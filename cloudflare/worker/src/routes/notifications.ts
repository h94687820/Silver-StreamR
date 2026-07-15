import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { createDb } from "../db";
import { getOrCreateUser } from "../auth";
import { getUserProfile } from "../helpers";
import { notificationsTable } from "../schema";
import { eq, and, desc, inArray, count } from "drizzle-orm";

const router = new Hono<HonoEnv>();

async function requireOnboarding(db: ReturnType<typeof createDb>, clerkId: string) {
  const user = await getOrCreateUser(db, clerkId);
  return user.onboardingComplete ? user : null;
}

// GET /notifications
router.get("/notifications", async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const limit = Math.min(Number(c.req.query("limit")) || 30, 50);
    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.recipientId, user.id))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(limit);

    const items = await Promise.all(
      notifications.map(async (n) => ({
        id: n.id,
        type: n.type,
        actorId: n.actorId,
        actor: await getUserProfile(db, n.actorId, user.id),
        postId: n.postId ?? null,
        commentId: n.commentId ?? null,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      })),
    );
    return c.json({ items, nextCursor: null });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// POST /notifications/read
router.post("/notifications/read", async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const { ids, all } = await c.req.json<{ ids?: string[]; all?: boolean }>();
    if (all) {
      await db
        .update(notificationsTable)
        .set({ isRead: true })
        .where(eq(notificationsTable.recipientId, user.id));
    } else if (ids && ids.length > 0) {
      await db
        .update(notificationsTable)
        .set({ isRead: true })
        .where(
          and(
            eq(notificationsTable.recipientId, user.id),
            inArray(notificationsTable.id, ids),
          ),
        );
    }
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// GET /notifications/unread-count
router.get("/notifications/unread-count", async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const result = await db
      .select({ count: count() })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.recipientId, user.id),
          eq(notificationsTable.isRead, false),
        ),
      );
    return c.json({ count: result[0]?.count ?? 0 });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

export default router;
