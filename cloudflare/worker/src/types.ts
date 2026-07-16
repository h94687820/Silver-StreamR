export type Bindings = {
  DB: D1Database;
  FORGE_BASE_URL: string;
  FORGE_API_KEY: string;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_FAPI: string;
};
export type Variables = {
  clerkId: string;
  isAdmin: boolean;
};
export type HonoEnv = { Bindings: Bindings; Variables: Variables; };
