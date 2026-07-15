export type Bindings = {
  /** Cloudflare D1 database binding — اسم الـ binding في wrangler.toml هو "DB" */
  DB: D1Database;
  /** Cloudflare R2 bucket binding — اسم الـ binding في wrangler.toml هو "STORAGE" */
  STORAGE: R2Bucket;
  /** رابط الملفات العام (CDN أو R2 public URL) */
  STORAGE_PUBLIC_URL: string;
  /** Clerk secret key لتحقق الـ JWT */
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
};

export type Variables = {
  clerkId: string;
};

export type HonoEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
