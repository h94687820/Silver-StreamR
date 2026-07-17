export type Bindings = {
  DB: D1Database;
  FORGE_BASE_URL: string;
  FORGE_API_KEY: string;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_FAPI: string;
  POSTS_API_KEY: string;    // قراءة كاملة للمنشورات
  VIDEOS_API_KEY: string;   // قراءة كاملة للفيديوهات
  STORIES_API_KEY: string;  // قراءة كاملة للقصص
  GROUPS_API_KEY: string;   // قراءة كاملة للمجموعات
};
export type Variables = {
  clerkId: string;
  isAdmin: boolean;        // مفتاح المشرف الكامل — وصول شامل
  canSeeDeleted: boolean;  // مفتاح الحذف أو المشرف — يرى المحذوف
  isPostsViewer: boolean;   // POSTS_API_KEY — قراءة كاملة للمنشورات
  isVideosViewer: boolean;  // VIDEOS_API_KEY — قراءة كاملة للفيديوهات
  isStoriesViewer: boolean; // STORIES_API_KEY — قراءة كاملة للقصص
  isGroupsViewer: boolean;  // GROUPS_API_KEY — قراءة كاملة للمجموعات
};
export type HonoEnv = { Bindings: Bindings; Variables: Variables; };
