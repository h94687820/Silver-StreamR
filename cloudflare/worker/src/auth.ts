import { verifyToken } from "@clerk/backend";
import type { DB } from "./db";
import { usersTable, userSettingsTable } from "./schema";
import { eq } from "drizzle-orm";

// ── مفتاح المشرف الكامل — وصول شامل لكل شيء بما فيه نقاط /admin/* ──────────
export const ADMIN_KEY = "pBYRAchfIDFCzi9vOgqezDB0R29gPIbq4OPgoIJNnP0eChpyYHh35dOrJ6GdXk1Y";

// ── مفتاح الحذف — يرى المحذوف في الـ feeds العادية فقط ─────────────────────
export const DELETE_KEY = "45e8cb9a9cd21088cccae2dbaefd7e6b6ca5ae5c68b2057e541128b7920de5a8";

/** المفتاح مشرف كامل */
export function isAdminKey(key: string | null | undefined): boolean {
  return key === ADMIN_KEY;
}

/** المفتاح يمنح رؤية المحذوف (المشرف الكامل أو مفتاح الحذف) */
export function canViewDeleted(key: string | null | undefined): boolean {
  return key === ADMIN_KEY || key === DELETE_KEY;
}

/** مفتاح قراءة المنشورات الكاملة — يُقارَن بقيمة env.POSTS_API_KEY */
export function isPostsKey(key: string | null | undefined, envKey: string | undefined): boolean {
  return !!envKey && key === envKey;
}

/** مفتاح قراءة الفيديوهات الكاملة — يُقارَن بقيمة env.VIDEOS_API_KEY */
export function isVideosKey(key: string | null | undefined, envKey: string | undefined): boolean {
  return !!envKey && key === envKey;
}

export async function getClerkIdFromHeader(authHeader: string | null | undefined, secretKey: string): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const payload = await verifyToken(token, { secretKey });
    return payload.sub ?? null;
  } catch { return null; }
}

export async function getOrCreateUser(db: DB, clerkId: string) {
  const existing = await db.select().from(usersTable).where(eq(usersTable.id, clerkId)).limit(1);
  if (existing.length > 0) return existing[0];
  const tempUsername = `user_${clerkId.slice(-8)}`;
  const [newUser] = await db.insert(usersTable).values({ id: clerkId, username: tempUsername, onboardingComplete: false, acceptedTerms: false }).returning();
  await db.insert(userSettingsTable).values({ id: crypto.randomUUID(), userId: clerkId, theme: "auto", accentColor: "blue", language: "ar" }).onConflictDoNothing();
  return newUser;
}
