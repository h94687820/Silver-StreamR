import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { createDb } from "../db";
import { getOrCreateUser } from "../auth";
import { userSettingsTable, usersTable } from "../schema";
import { eq } from "drizzle-orm";

const router = new Hono<HonoEnv>();

async function requireOnboarding(db: ReturnType<typeof createDb>, clerkId: string) {
  const user = await getOrCreateUser(db, clerkId);
  return user.onboardingComplete ? user : null;
}

async function ensureSettings(db: ReturnType<typeof createDb>, userId: string) {
  let settings = await db
    .select()
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId))
    .limit(1);
  if (!settings[0]) {
    await db
      .insert(userSettingsTable)
      .values({ id: crypto.randomUUID(), userId, theme: "auto", accentColor: "blue", language: "ar" })
      .onConflictDoNothing();
    settings = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, userId))
      .limit(1);
  }
  return settings[0];
}

// GET /settings
router.get("/settings", async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);
    const settings = await ensureSettings(db, user.id);
    return c.json(settings);
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// PATCH /settings
router.patch("/settings", async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);

    const { theme, accentColor, language, savedPostsPublic } =
      await c.req.json<Record<string, any>>();

    await ensureSettings(db, user.id);
    await db
      .update(userSettingsTable)
      .set({
        ...(theme ? { theme } : {}),
        ...(accentColor ? { accentColor } : {}),
        ...(language ? { language } : {}),
        ...(savedPostsPublic !== undefined ? { savedPostsPublic } : {}),
      })
      .where(eq(userSettingsTable.userId, user.id));

    const settings = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, user.id))
      .limit(1);
    return c.json(settings[0]);
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

// DELETE /settings/delete-account
router.delete("/settings/delete-account", async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);
    const clerkId = c.get("clerkId");
    const user = await requireOnboarding(db, clerkId);
    if (!user) return c.json({ error: "Onboarding required", onboardingRequired: true }, 403);
    await db.delete(usersTable).where(eq(usersTable.id, user.id));
    return c.json({ success: true });
  } catch {
    return c.json({ error: "Server error" }, 500);
  }
});

export default router;
