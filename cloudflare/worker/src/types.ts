export type Bindings = {
  DATABASE_URL: string;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  STORAGE_ENDPOINT: string;
  STORAGE_BUCKET: string;
  STORAGE_ACCESS_KEY_ID: string;
  STORAGE_SECRET_ACCESS_KEY: string;
  STORAGE_REGION: string;
  STORAGE_PUBLIC_URL: string;
};

export type Variables = {
  clerkId: string;
};

export type HonoEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
