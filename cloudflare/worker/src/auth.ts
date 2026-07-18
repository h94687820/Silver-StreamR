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
const _DEV_PORTAL_KEY       = "25a677d3e4802451a38a245805755594ec74397c4529c8c6ff7e09a76ec0819b8ec290ef13e5687d";
/** قراءة البلاغات الخاصة (mode=specific) فقط */
const _REPORTS_SPECIFIC_KEY = "Bkrx2g36PbqFpK9AhnthSOFs4pNHp80Kotx3C1n3TQIZebepUc0sIjHBxUAqBqxp";
/** قراءة البلاغات العامة (mode=general) فقط */
const _REPORTS_GENERAL_KEY  = "0QicAChHbpMuhWT0ySjZReGCYVqjDkTsbbESiKOS565GKzquDQp4cUkRc7xWiAaO";

/** المفتاح يملك وصولاً كاملاً للبورتال (يقبل env أو الثابت المضمَّن) */
export function isDevPortalFullKey(key: string | null | undefined, envKey: string | undefined): boolean {
  if (!key) return false;
  return key === _DEV_PORTAL_KEY || (!!envKey && key === envKey);
}
/** المفتاح خاص بالبلاغات — specificKey أو generalKey */
export function isDevPortalReportsKey(
  key: string | null | undefined,
  specificKey: string | undefined,
  generalKey: string | undefined,
): boolean {
  if (!key) return false;
  return key === _REPORTS_SPECIFIC_KEY || key === _REPORTS_GENERAL_KEY
      || (!!specificKey && key === specificKey) || (!!generalKey && key === generalKey);
}
/** يُعيد وضع البلاغات للمفتاح المُعطى */
export function getReportsMode(
  key: string | null | undefined,
  specificKey: string | undefined,
  generalKey: string | undefined,
): "specific" | "general" | "" {
  if (!key) return "";
  if (key === _REPORTS_SPECIFIC_KEY || (!!specificKey && key === specificKey)) return "specific";
  if (key === _REPORTS_GENERAL_KEY  || (!!generalKey  && key === generalKey))  return "general";
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
