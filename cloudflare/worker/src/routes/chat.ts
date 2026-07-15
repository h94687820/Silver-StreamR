import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { createDb } from "../db";
import { getOrCreateUser } from "../auth";
import { getUserProfile } from "../helpers";
import {
  conversationsTable,
  conversationParticipantsTable,
  messagesTable,
} from "../schema";
import { eq, and, desc } from "drizzle-orm";

const router = new Hono<HonoEnv>();

async function requireOnboarding(db: ReturnType<typeof createDb>, clerkId: string) {
  const user = await getOrCreateUser(db, clerkId);
  return user.onboardingComplete ? user : null;
}

// GET /conversations
router.get("/conversations", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const userId = user.id;
    const participations = await db
      .select()
      .from(conversationParticipantsTable)
      .where(eq(conversationParticipantsTable.userId, userId));

    const convs = await Promise.all(
      participations.map(async (p) => {
        const conv = await db
          .select()
          .from(conversationsTable)
          .where(eq(conversationsTable.id, p.conversationId))
          .limit(1);
        if (!conv[0]) return null;

        const others = await db
          .select()
          .from(conversationParticipantsTable)
          .where(eq(conversationParticipantsTable.conversationId, p.conversationId));
        const otherId = others.find((o) => o.userId !== userId)?.userId;
        if (!otherId) return null;

        const participant = await getUserProfile(db, otherId, userId);
        const lastMsg = await db
          .select()
          .from(messagesTable)
          .where(eq(messagesTable.conversationId, p.conversationId))
          .orderBy(desc(messagesTable.createdAt))
          .limit(1);

        return {
          id: conv[0].id,
          participant,
          lastMessage: lastMsg[0]
            ? {
                content: lastMsg[0].content,
                createdAt: lastMsg[0].createdAt.toISOString(),
                isMe: lastMsg[0].senderId === userId,
              }
            : null,
          unreadCount: 0,
          updatedAt: conv[0].updatedAt.toISOString(),
        };
      }),
    );

    const sorted = convs
      .filter(Boolean)
      .sort((a, b) => new Date(b!.updatedAt).getTime() - new Date(a!.updatedAt).getTime());

    return c.json(sorted);
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// POST /conversations
router.post("/conversations", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const { participantId } = await c.req.json<{ participantId?: string }>();
    if (!participantId) return c.json({ error: "participantId required" }, 400);

    const userId = user.id;
    const myConvs = await db
      .select({ convId: conversationParticipantsTable.conversationId })
      .from(conversationParticipantsTable)
      .where(eq(conversationParticipantsTable.userId, userId));
    const theirConvs = await db
      .select({ convId: conversationParticipantsTable.conversationId })
      .from(conversationParticipantsTable)
      .where(eq(conversationParticipantsTable.userId, participantId));

    const myIds = new Set(myConvs.map((c) => c.convId));
    const existing = theirConvs.find((c) => myIds.has(c.convId));

    let convId: string;
    if (existing) {
      convId = existing.convId;
    } else {
      convId = crypto.randomUUID();
      await db.insert(conversationsTable).values({ id: convId });
      await db.insert(conversationParticipantsTable).values([
        { conversationId: convId, userId },
        { conversationId: convId, userId: participantId },
      ]);
    }

    const participant = await getUserProfile(db, participantId, userId);
    return c.json({
      id: convId,
      participant,
      lastMessage: null,
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// GET /conversations/:conversationId/messages
router.get("/conversations/:conversationId/messages", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const conversationId = c.req.param("conversationId");
    const limit = Math.min(Number(c.req.query("limit")) || 30, 50);

    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(desc(messagesTable.createdAt))
      .limit(limit);

    const items = await Promise.all(
      messages.map(async (m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        sender: await getUserProfile(db, m.senderId, user.id),
        content: m.content,
        isMe: m.senderId === user.id,
        createdAt: m.createdAt.toISOString(),
      })),
    );

    return c.json({ items: items.reverse(), nextCursor: null });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// POST /conversations/:conversationId/messages
router.post("/conversations/:conversationId/messages", async (c) => {
  try {
    const db = createDb(c.env.DB);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const conversationId = c.req.param("conversationId");
    const { content } = await c.req.json<{ content?: string }>();
    if (!content) return c.json({ error: "Content required" }, 400);

    const [msg] = await db
      .insert(messagesTable)
      .values({
        id: crypto.randomUUID(),
        conversationId,
        senderId: user.id,
        content,
      })
      .returning();

    await db
      .update(conversationsTable)
      .set({ updatedAt: new Date() })
      .where(eq(conversationsTable.id, conversationId));

    const sender = await getUserProfile(db, user.id, user.id);
    return c.json(
      {
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        sender,
        content: msg.content,
        isMe: true,
        createdAt: msg.createdAt.toISOString(),
      },
      201,
    );
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

export default router;
