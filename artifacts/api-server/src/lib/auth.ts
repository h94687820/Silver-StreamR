import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable, userSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function requireAuth<
  P = Record<string, string>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
>(req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response<any>, next: NextFunction) {
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
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  if (!user.onboardingComplete) {
    res.status(403).json({ error: "Onboarding required", onboardingRequired: true });
    return;
  }
  (req as any).user = user;
  next();
}
