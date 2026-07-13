import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, conversationParticipantsTable, messagesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireOnboarding } from "../lib/auth";
import { getUserProfile } from "../lib/helpers";

const router = Router();

// GET /conversations
router.get("/conversations", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const participations = await db.select().from(conversationParticipantsTable)
      .where(eq(conversationParticipantsTable.userId, userId));

    const convs = await Promise.all(participations.map(async p => {
      const conv = await db.select().from(conversationsTable).where(eq(conversationsTable.id, p.conversationId)).limit(1);
      if (!conv[0]) return null;
      // Get the other participant
      const others = await db.select().from(conversationParticipantsTable)
        .where(and(eq(conversationParticipantsTable.conversationId, p.conversationId)));
      const otherId = others.find(o => o.userId !== userId)?.userId;
      if (!otherId) return null;
      const participant = await getUserProfile(otherId, userId);
      // Last message
      const lastMsg = await db.select().from(messagesTable)
        .where(eq(messagesTable.conversationId, p.conversationId))
        .orderBy(desc(messagesTable.createdAt)).limit(1);
      return {
        id: conv[0].id,
        participant,
        lastMessage: lastMsg[0] ? {
          content: lastMsg[0].content,
          createdAt: lastMsg[0].createdAt.toISOString(),
          isMe: lastMsg[0].senderId === userId,
        } : null,
        unreadCount: 0,
        updatedAt: conv[0].updatedAt.toISOString(),
      };
    }));
    res.json(convs.filter(Boolean).sort((a, b) => new Date(b!.updatedAt).getTime() - new Date(a!.updatedAt).getTime()));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /conversations
router.post("/conversations", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { participantId } = req.body;
    if (!participantId) { res.status(400).json({ error: "participantId required" }); return; }

    // Check if conversation already exists
    const myConvs = await db.select({ convId: conversationParticipantsTable.conversationId })
      .from(conversationParticipantsTable).where(eq(conversationParticipantsTable.userId, userId));
    const theirConvs = await db.select({ convId: conversationParticipantsTable.conversationId })
      .from(conversationParticipantsTable).where(eq(conversationParticipantsTable.userId, participantId));
    const myIds = new Set(myConvs.map(c => c.convId));
    const existing = theirConvs.find(c => myIds.has(c.convId));

    let convId: string;
    if (existing) {
      convId = existing.convId;
    } else {
      convId = randomUUID();
      await db.insert(conversationsTable).values({ id: convId });
      await db.insert(conversationParticipantsTable).values([
        { conversationId: convId, userId },
        { conversationId: convId, userId: participantId },
      ]);
    }

    const participant = await getUserProfile(participantId, userId);
    res.json({ id: convId, participant, lastMessage: null, unreadCount: 0, updatedAt: new Date().toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /conversations/:conversationId/messages
router.get("/conversations/:conversationId/messages", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const limit = Math.min(Number(req.query.limit) || 30, 50);
    const messages = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, req.params.conversationId))
      .orderBy(desc(messagesTable.createdAt)).limit(limit);
    const items = await Promise.all(messages.map(async m => ({
      id: m.id, conversationId: m.conversationId, senderId: m.senderId,
      sender: await getUserProfile(m.senderId, userId),
      content: m.content, isMe: m.senderId === userId,
      createdAt: m.createdAt.toISOString(),
    })));
    res.json({ items: items.reverse(), nextCursor: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /conversations/:conversationId/messages
router.post("/conversations/:conversationId/messages", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { content } = req.body;
    if (!content) { res.status(400).json({ error: "Content required" }); return; }
    const [msg] = await db.insert(messagesTable).values({
      id: randomUUID(), conversationId: req.params.conversationId, senderId: userId, content,
    }).returning();
    await db.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, req.params.conversationId));
    const sender = await getUserProfile(userId, userId);
    res.status(201).json({
      id: msg.id, conversationId: msg.conversationId, senderId: msg.senderId,
      sender, content: msg.content, isMe: true, createdAt: msg.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
