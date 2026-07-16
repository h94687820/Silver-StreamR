export type Bindings = {
  /** Cloudflare D1 database binding */
  DB: D1Database;
  /** رابط قاعدة FORGE لخدمة التخزين */
  FORGE_BASE_URL: string;
  /** FORGE API Key — سر يُضاف عبر wrangler secret put */
  FORGE_API_KEY: string;
  /** Clerk secret key لتحقق الـ JWT */
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  /** Clerk Frontend API URL — derived from VITE_CLERK_PUBLISHABLE_KEY */
  CLERK_FAPI: string;
};

export type Variables = {
  clerkId: string;
};

export type HonoEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
