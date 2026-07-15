import { verifyToken } from "@clerk/backend";
import type { DB } from "./db";
import { usersTable, userSettingsTable } from "./schema";
import { eq } from "drizzle-orm";

export async function getClerkIdFromHeader(
  authHeader: string | null | undefined,
  secretKey: string,
): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const payload = await verifyToken(token, { secretKey });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export async function getOrCreateUser(db: DB, clerkId: string) {
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, clerkId))
    .limit(1);
  if (existing.length > 0) return existing[0];

  const tempUsername = `user_${clerkId.slice(-8)}`;
  const [newUser] = await db
    .insert(usersTable)
    .values({
      id: clerkId,
      username: tempUsername,
      onboardingComplete: false,
      acceptedTerms: false,
    })
    .returning();

  await db
    .insert(userSettingsTable)
    .values({
      id: crypto.randomUUID(),
      userId: clerkId,
      theme: "auto",
      accentColor: "blue",
      language: "ar",
    })
    .onConflictDoNothing();

  return newUser;
}
