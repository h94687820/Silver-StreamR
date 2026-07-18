import { verifyToken } from "@clerk/backend";
import type { DB } from "./db";
import { usersTable, userSettingsTable } from "./schema";
import { eq } from "drizzle-orm";

// ── مفتاح المشرف الكامل — وصول شامل لكل شيء بما فيه نقاط /admin/* ──────────
export const ADMIN_KEY = "pBYRAchfIDFCzi9vOgqezDB0R29gPIbq4OPgoIJNnP0eChpyYHh35dOrJ6GdXk1Y";

// ── مفتاح الحذف — يرى المحذوف في الـ feeds العادية فقط ─────────────────────
export const DELETE_KEY = "pBYRAchfIDFCzi9vOgqezDB0R29gPIbq4OPgoIJNnP0eChpyYHh35dOrJ6GdXk1Y";

// ── مفاتيح بوابة المطورين — تُقرأ من env (لا قيم مضمّنة) ─────────────────────

/** المفتاح يملك وصولاً كاملاً للبورتال */
export function isDevPortalFullKey(key: string | null | undefined, envKey: string | undefined): boolean {
  return !!envKey && !!key && key === envKey;
}
/** المفتاح خاص بالبلاغات — specificKey أو generalKey */
export function isDevPortalReportsKey(
  key: string | null | undefined,
  specificKey: string | undefined,
  generalKey: string | undefined,
): boolean {
  if (!key) return false;
  return (!!specificKey && key === specificKey) || (!!generalKey && key === generalKey);
}
/** يُعيد وضع البلاغات للمفتاح المُعطى */
export function getReportsMode(
  key: string | null | undefined,
  specificKey: string | undefined,
  generalKey: string | undefined,
): "specific" | "general" | "" {
  if (!key) return "";
  if (!!specificKey && key === specificKey) return "specific";
  if (!!generalKey  && key === generalKey)  return "general";
  return "";
}

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
