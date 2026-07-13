import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, userSettingsTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireOnboarding, getOrCreateUser } from "../lib/auth";
import { getUserProfile } from "../lib/helpers";

const router = Router();

// GET /users/me
router.get("/users/me", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).clerkId;
    const user = await getOrCreateUser(clerkId);
    const profile = await getUserProfile(user.id, clerkId);
    res.json(profile);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /users/me
router.patch("/users/me", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).clerkId;
    const { displayName, bio, avatarUrl } = req.body;
    await db.update(usersTable).set({
      ...(displayName !== undefined ? { displayName } : {}),
      ...(bio !== undefined ? { bio } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      updatedAt: new Date(),
    }).where(eq(usersTable.id, clerkId));
    const profile = await getUserProfile(clerkId, clerkId);
    res.json(profile);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /users/me/complete-onboarding
router.post("/users/me/complete-onboarding", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).clerkId;
    const { username, displayName, acceptedTerms } = req.body;
    if (!username || !acceptedTerms) {
      res.status(400).json({ error: "Username and terms acceptance required" });
      return;
    }
    // Check username availability
    const existing = await db.select().from(usersTable)
      .where(eq(usersTable.username, username.toLowerCase())).limit(1);
    if (existing.length > 0 && existing[0].id !== clerkId) {
      res.status(400).json({ error: "Username already taken" });
      return;
    }

    await getOrCreateUser(clerkId);
    await db.update(usersTable).set({
      username: username.toLowerCase(),
      displayName: displayName || username,
      onboardingComplete: true,
      acceptedTerms: true,
      updatedAt: new Date(),
    }).where(eq(usersTable.id, clerkId));

    // Ensure settings exist
    await db.insert(userSettingsTable).values({
      id: randomUUID(),
      userId: clerkId,
      theme: "auto",
      accentColor: "blue",
      language: "ar",
    }).onConflictDoNothing();

    const profile = await getUserProfile(clerkId, clerkId);
    res.json(profile);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /users/check-username
router.get("/users/check-username", async (req, res) => {
  try {
    const { username } = req.query as { username: string };
    if (!username) { res.status(400).json({ error: "Username required" }); return; }
    const existing = await db.select().from(usersTable)
      .where(eq(usersTable.username, username.toLowerCase())).limit(1);
    res.json({ available: existing.length === 0, username: username.toLowerCase() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /users/:username
router.get("/users/:username", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).clerkId;
    const { username } = req.params;
    const users = await db.select().from(usersTable)
      .where(eq(usersTable.username, username.toLowerCase())).limit(1);
    if (!users[0]) { res.status(404).json({ error: "User not found" }); return; }
    const profile = await getUserProfile(users[0].id, clerkId);
    res.json(profile);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /users/:userId/follow (followers/following)
router.get("/users/:userId/followers", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).clerkId;
    const { followsTable } = await import("@workspace/db");
    const followers = await db.select().from(followsTable)
      .where(eq(followsTable.followingId, req.params.userId));
    const profiles = await Promise.all(
      followers.map(f => getUserProfile(f.followerId, clerkId))
    );
    res.json({ items: profiles.filter(Boolean), nextCursor: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/users/:userId/following", requireAuth, async (req, res) => {
  try {
    const clerkId = (req as any).clerkId;
    const { followsTable } = await import("@workspace/db");
    const following = await db.select().from(followsTable)
      .where(eq(followsTable.followerId, req.params.userId));
    const profiles = await Promise.all(
      following.map(f => getUserProfile(f.followingId, clerkId))
    );
    res.json({ items: profiles.filter(Boolean), nextCursor: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
