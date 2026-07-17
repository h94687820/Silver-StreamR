import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable, userSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const ADMIN_CLERK_ID = "__admin__";

/**
 * Returns true if the request carries a valid ADMIN_API_KEY.
 * Accepts the key via:
 *   - Header:  x-admin-key: <key>
 *   - Header:  Authorization: Bearer <key>
 */
function hasAdminKey(req: Request): boolean {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) return false;

  const xAdminKey = req.headers["x-admin-key"];
  if (xAdminKey === adminKey) return true;

  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ") && authHeader.slice(7) === adminKey) return true;

  return false;
}

/**
 * Returns true if the request carries a valid FORGE_API_KEY (developer read-only key).
 * Accepts the key via:
 *   - Header:  x-forge-key: <key>
 *   - Header:  Authorization: Bearer <key>
 */
export function hasForgeKey(req: Request): boolean {
  const forgeKey = process.env.FORGE_API_KEY;
  if (!forgeKey) return false;

  const xForgeKey = req.headers["x-forge-key"];
  if (xForgeKey === forgeKey) return true;

  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ") && authHeader.slice(7) === forgeKey) return true;

  return false;
}

/**
 * Middleware: allows only requests with a valid FORGE_API_KEY.
 * Does not grant admin privileges — read-only developer access.
 */
export function requireForgeKey(req: Request, res: Response, next: NextFunction) {
  if (hasForgeKey(req)) {
    next();
    return;
  }
  res.status(401).json({ error: "Unauthorized: valid Forge key required" });
}

export async function requireAuth<
  P = Record<string, string>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
>(req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response<any>, next: NextFunction) {
  // Admin API key bypasses Clerk auth entirely
  if (hasAdminKey(req)) {
    (req as any).clerkId = ADMIN_CLERK_ID;
    (req as any).isAdmin = true;
    next();
    return;
  }

  const auth = getAuth(req as any);
  const clerkId = auth?.userId;
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).clerkId = clerkId;
  next();
}

export const getOrCreateUser = async (clerkId: string) => {
  const existing = await db.select().from(usersTable).where(eq(usersTable.id, clerkId)).limit(1);
  if (existing.length > 0) return existing[0];
  
  // Create a new user with a temporary username
  const tempUsername = `user_${clerkId.slice(-8)}`;
  const [newUser] = await db.insert(usersTable).values({
    id: clerkId,
    username: tempUsername,
    onboardingComplete: false,
    acceptedTerms: false,
  }).returning();

  // Create default settings
  await db.insert(userSettingsTable).values({
    id: randomUUID(),
    userId: clerkId,
    theme: "auto",
    accentColor: "blue",
    language: "ar",
  }).onConflictDoNothing();

  return newUser;
};

export async function requireOnboarding<
  P = Record<string, string>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
>(req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response<any>, next: NextFunction) {
  // Admin key bypasses onboarding check
  if ((req as any).isAdmin) {
    next();
    return;
  }

  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  if (!user.onboardingComplete) {
    res.status(403).json({ error: "Onboarding required", onboardingRequired: true });
    return;
  }
  (req as any).user = user;
  next();
}
