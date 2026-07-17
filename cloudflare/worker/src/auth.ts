import { verifyToken } from "@clerk/backend";
import type { DB } from "./db";
import { usersTable, userSettingsTable } from "./schema";
import { eq } from "drizzle-orm";

// ── مفتاح المشرف الكامل — وصول شامل لكل شيء بما فيه نقاط /admin/* ──────────
export const ADMIN_KEY = "db5957e7c74d95269e1882f657542c6a486fd3fb8d203c203a53063f5a2d8558";

// ── مفتاح الحذف — يرى المحذوف في الـ feeds العادية فقط ─────────────────────
export const DELETE_KEY = "f9fa6e461ba955b4c408b17817f2d0921f164cfd75388d75619a6e60df9321f4";

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

/** مفتاح قراءة القصص الكاملة — يُقارَن بقيمة env.STORIES_API_KEY */
export function isStoriesKey(key: string | null | undefined, envKey: string | undefined): boolean {
  return !!envKey && key === envKey;
}

/** مفتاح قراءة المجموعات الكاملة — يُقارَن بقيمة env.GROUPS_API_KEY */
export function isGroupsKey(key: string | null | undefined, envKey: string | undefined): boolean {
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
