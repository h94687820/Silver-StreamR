import { verifyToken } from "@clerk/backend";
import type { DB } from "./db";
import { usersTable, userSettingsTable } from "./schema";
import { eq } from "drizzle-orm";

// ── مفتاح المشرف الكامل — وصول شامل لكل شيء بما فيه نقاط /admin/* ──────────
export const ADMIN_KEY = "pBYRAchfIDFCzi9vOgqezDB0R29gPIbq4OPgoIJNnP0eChpyYHh35dOrJ6GdXk1Y";

// ── مفتاح الحذف — يرى المحذوف في الـ feeds العادية فقط ─────────────────────
export const DELETE_KEY = "pBYRAchfIDFCzi9vOgqezDB0R29gPIbq4OPgoIJNnP0eChpyYHh35dOrJ6GdXk1Y";

// ── مفاتيح بوابة المطورين ─────────────────────────────────────────────────────
/** وصول كامل لجميع نقاط البوابة */
export const DEV_PORTAL_KEY      = "79679158ec7728f4ee28e53da453883da0f7df45cd412ff26f2a9f1f83f09cec";
/** قراءة البلاغات الخاصة (mode=specific) فقط */
export const PRIVATE_REPORTS_KEY = "Bkrx2g36PbqFpK9AhnthSOFs4pNHp80Kotx3C1n3TQIZebepUc0sIjHBxUAqBqxp";
/** قراءة البلاغات العامة (mode=general) فقط */
export const PUBLIC_REPORTS_KEY  = "0QicAChHbpMuhWT0ySjZReGCYVqjDkTsbbESiKOS565GKzquDQp4cUkRc7xWiAaO";

/** المفتاح يملك وصولاً كاملاً للبورتال */
export function isDevPortalFullKey(key: string | null | undefined): boolean {
  return key === DEV_PORTAL_KEY;
}
/** المفتاح خاص بالبلاغات فقط */
export function isDevPortalReportsKey(key: string | null | undefined): boolean {
  return key === PRIVATE_REPORTS_KEY || key === PUBLIC_REPORTS_KEY;
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
