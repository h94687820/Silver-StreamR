import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { createDb } from "../db";
import { getOrCreateUser } from "../auth";
import { reactionsTable, postsTable, notificationsTable } from "../schema";
import { eq, and, sql } from "drizzle-orm";

const router = new Hono<HonoEnv>();

const SERVICE_KEYS = new Set(["admin", "posts-viewer", "videos-viewer", "stories-viewer", "groups-viewer", "delete-viewer"]);

async function requireOnboarding(db: ReturnType<typeof createDb>, clerkId: string) {
  // مفاتيح الخدمة لا تملك كتابة تفاعلات — ترفض مباشرةً
  if (SERVICE_KEYS.has(clerkId) && clerkId !== "admin") return null;
  if (clerkId === "admin") return { id: "admin", onboardingComplete: true, acceptedTerms: true } as any;
  const user = await getOrCreateUser(db, clerkId);
  return user.onboardingComplete ? user : null;
}

// POST /posts/:postId/react
router.post("/posts/:postId/react", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const postId = c.req.param("postId");
    const { type } = await c.req.json<{ type: string }>();
    const userId = user.id;

    const post = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    if (!post[0]) return c.json({ error: "Not found" }, 404);

    const existing = await db
      .select()
      .from(reactionsTable)
      .where(and(eq(reactionsTable.userId, userId), eq(reactionsTable.postId, postId)))
      .limit(1);

    if (existing[0]) {
      if (existing[0].type !== type) {
        const oldType = existing[0].type;
        await db
          .update(reactionsTable)
          .set({ type })
          .where(and(eq(reactionsTable.userId, userId), eq(reactionsTable.postId, postId)));
        if (oldType === "like") {
          await db
            .update(postsTable)
            .set({
              likesCount: sql`GREATEST(${postsTable.likesCount} - 1, 0)`,
              dislikesCount: sql`${postsTable.dislikesCount} + 1`,
            })
            .where(eq(postsTable.id, postId));
        } else {
          await db
            .update(postsTable)
            .set({
              dislikesCount: sql`GREATEST(${postsTable.dislikesCount} - 1, 0)`,
              likesCount: sql`${postsTable.likesCount} + 1`,
            })
            .where(eq(postsTable.id, postId));
        }
      }
    } else {
      await db.insert(reactionsTable).values({ userId, postId, type });
      if (type === "like") {
        await db
          .update(postsTable)
          .set({ likesCount: sql`${postsTable.likesCount} + 1` })
          .where(eq(postsTable.id, postId));
      } else {
        await db
          .update(postsTable)
          .set({ dislikesCount: sql`${postsTable.dislikesCount} + 1` })
          .where(eq(postsTable.id, postId));
      }
      if (type === "like") {
        await db.insert(notificationsTable).values({
          id: crypto.randomUUID(),
          recipientId: post[0].authorId,
          actorId: userId,
          type: "like",
          postId,
        });
      }
    }

    const updated = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .limit(1);
    return c.json({
      myReaction: type,
      likesCount: updated[0].likesCount,
      dislikesCount: updated[0].dislikesCount,
    });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// DELETE /posts/:postId/react
router.delete("/posts/:postId/react", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const postId = c.req.param("postId");
    const userId = user.id;

    const existing = await db
      .select()
      .from(reactionsTable)
      .where(and(eq(reactionsTable.userId, userId), eq(reactionsTable.postId, postId)))
      .limit(1);

    if (existing[0]) {
      await db
        .delete(reactionsTable)
        .where(and(eq(reactionsTable.userId, userId), eq(reactionsTable.postId, postId)));
      if (existing[0].type === "like") {
        await db
          .update(postsTable)
          .set({ likesCount: sql`GREATEST(${postsTable.likesCount} - 1, 0)` })
          .where(eq(postsTable.id, postId));
      } else {
        await db
          .update(postsTable)
          .set({ dislikesCount: sql`GREATEST(${postsTable.dislikesCount} - 1, 0)` })
          .where(eq(postsTable.id, postId));
      }
    }

    const updated = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .limit(1);
    return c.json({
      myReaction: null,
      likesCount: updated[0]?.likesCount ?? 0,
      dislikesCount: updated[0]?.dislikesCount ?? 0,
    });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

export default router;
