import { Router } from "express";
import { db } from "@workspace/db";
import { userSettingsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireOnboarding } from "../lib/auth";
import { getAuth } from "@clerk/express";

const router = Router();

// GET /settings
router.get("/settings", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    let settings = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId)).limit(1);
    if (!settings[0]) {
      await db.insert(userSettingsTable).values({ id: randomUUID(), userId, theme: "auto", accentColor: "blue", language: "ar" });
      settings = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId)).limit(1);
    }
    res.json(settings[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /settings
router.patch("/settings", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { theme, accentColor, language, savedPostsPublic } = req.body;
    let settings = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId)).limit(1);
    if (!settings[0]) {
      await db.insert(userSettingsTable).values({ id: randomUUID(), userId, theme: "auto", accentColor: "blue", language: "ar" });
    }
    await db.update(userSettingsTable).set({
      ...(theme ? { theme } : {}),
      ...(accentColor ? { accentColor } : {}),
      ...(language ? { language } : {}),
      ...(savedPostsPublic !== undefined ? { savedPostsPublic } : {}),
    }).where(eq(userSettingsTable.userId, userId));
    settings = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId)).limit(1);
    res.json(settings[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /settings/delete-account
router.delete("/settings/delete-account", requireAuth, requireOnboarding, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    await db.delete(usersTable).where(eq(usersTable.id, userId));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
