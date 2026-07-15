import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { createDb } from "../db";
import { getOrCreateUser } from "../auth";
import { getUserProfile } from "../helpers";
import { usersTable, userSettingsTable, followsTable } from "../schema";
import { eq } from "drizzle-orm";

const router = new Hono<HonoEnv>();

// GET /users/me
router.get("/users/me", async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);
    const clerkId = c.get("clerkId");
    const user = await getOrCreateUser(db, clerkId);
    const profile = await getUserProfile(db, user.id, clerkId);
    return c.json(profile);
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// PATCH /users/me
router.patch("/users/me", async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);
    const clerkId = c.get("clerkId");
    const body = await c.req.json<{
      username?: string;
      displayName?: string;
      bio?: string;
      avatarUrl?: string;
      coverUrl?: string;
    }>();
    const { username, displayName, bio, avatarUrl, coverUrl } = body;

    if (username !== undefined) {
      const normalized = String(username).toLowerCase().trim();
      if (!/^[a-z0-9_]{3,30}$/.test(normalized)) {
        return c.json(
          { error: "Username must be 3-30 characters (letters, numbers, underscores only)" },
          400,
        );
      }
      const existing = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.username, normalized))
        .limit(1);
      if (existing.length > 0 && existing[0].id !== clerkId) {
        return c.json({ error: "Username already taken" }, 400);
      }
    }

    await db
      .update(usersTable)
      .set({
        ...(username !== undefined ? { username: String(username).toLowerCase().trim() } : {}),
        ...(displayName !== undefined ? { displayName } : {}),
        ...(bio !== undefined ? { bio } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        ...(coverUrl !== undefined ? { coverUrl } : {}),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, clerkId));

    const profile = await getUserProfile(db, clerkId, clerkId);
    return c.json(profile);
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// POST /users/me/complete-onboarding
router.post("/users/me/complete-onboarding", async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);
    const clerkId = c.get("clerkId");
    const body = await c.req.json<{
      username?: string;
      displayName?: string;
      acceptedTerms?: boolean;
    }>();
    const { username, displayName, acceptedTerms } = body;

    if (!username || !acceptedTerms) {
      return c.json({ error: "Username and terms acceptance required" }, 400);
    }
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username.toLowerCase()))
      .limit(1);
    if (existing.length > 0 && existing[0].id !== clerkId) {
      return c.json({ error: "Username already taken" }, 400);
    }

    await getOrCreateUser(db, clerkId);
    await db
      .update(usersTable)
      .set({
        username: username.toLowerCase(),
        displayName: displayName || username,
        onboardingComplete: true,
        acceptedTerms: true,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, clerkId));

    await db
      .insert(userSettingsTable)
      .values({
        id: crypto.randomUUID(),
        userId: clerkId,
        theme: "auto",
        accentColor: "blue",
        language: "ar",
      })
      .onConflictDoNothing();

    const profile = await getUserProfile(db, clerkId, clerkId);
    return c.json(profile);
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// GET /users/check-username  (public, no onboarding needed)
router.get("/users/check-username", async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);
    const username = c.req.query("username");
    if (!username) return c.json({ error: "Username required" }, 400);
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username.toLowerCase()))
      .limit(1);
    return c.json({ available: existing.length === 0, username: username.toLowerCase() });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// GET /users/:username
router.get("/users/:username", async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);
    const clerkId = c.get("clerkId");
    const username = c.req.param("username");
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username.toLowerCase()))
      .limit(1);
    if (!users[0]) return c.json({ error: "User not found" }, 404);
    const profile = await getUserProfile(db, users[0].id, clerkId);
    return c.json(profile);
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// GET /users/:userId/followers
router.get("/users/:userId/followers", async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);
    const clerkId = c.get("clerkId");
    const userId = c.req.param("userId");
    const followers = await db
      .select()
      .from(followsTable)
      .where(eq(followsTable.followingId, userId));
    const profiles = await Promise.all(
      followers.map((f) => getUserProfile(db, f.followerId, clerkId)),
    );
    return c.json({ items: profiles.filter(Boolean), nextCursor: null });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// GET /users/:userId/following
router.get("/users/:userId/following", async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);
    const clerkId = c.get("clerkId");
    const userId = c.req.param("userId");
    const following = await db
      .select()
      .from(followsTable)
      .where(eq(followsTable.followerId, userId));
    const profiles = await Promise.all(
      following.map((f) => getUserProfile(db, f.followingId, clerkId)),
    );
    return c.json({ items: profiles.filter(Boolean), nextCursor: null });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

export default router;
