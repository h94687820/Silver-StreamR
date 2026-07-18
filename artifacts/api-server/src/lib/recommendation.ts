import { db } from "@workspace/db";
import { userInteractionsTable } from "@workspace/db";
import { eq, gt, and } from "drizzle-orm";
import type { Post } from "@workspace/db";

// ─── Weights per action ────────────────────────────────────────────────────
const ACTION_WEIGHT: Record<string, number> = {
  view: 1,
  like: 5,
  dislike: -2,
  comment: 6,
  save: 8,
};

export interface InterestProfile {
  hashtags: Map<string, number>;    // hashtag → accumulated score
  mediaType: Map<string, number>;   // "image"|"video" → accumulated score
  authors: Map<string, number>;     // authorId → accumulated score
  groups: Map<string, number>;      // groupId → accumulated score
  totalWeight: number;
}

/**
 * Build an interest profile from the user's last 90 days of interactions.
 * Returns null (signals no history) when totalWeight < 3.
 */
export async function buildInterestProfile(userId: string): Promise<InterestProfile | null> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select()
    .from(userInteractionsTable)
    .where(
      and(
        eq(userInteractionsTable.userId, userId),
        gt(userInteractionsTable.createdAt, since)
      )
    )
    .limit(2000);

  if (rows.length === 0) return null;

  const profile: InterestProfile = {
    hashtags: new Map(),
    mediaType: new Map(),
    authors: new Map(),
    groups: new Map(),
    totalWeight: 0,
  };

  for (const row of rows) {
    const w = ACTION_WEIGHT[row.action] ?? 0;

    // Hashtags
    for (const tag of row.hashtags) {
      profile.hashtags.set(tag, (profile.hashtags.get(tag) ?? 0) + w);
    }

    // Media type
    if (row.mediaType) {
      profile.mediaType.set(row.mediaType, (profile.mediaType.get(row.mediaType) ?? 0) + w);
    }

    // Author
    profile.authors.set(row.authorId, (profile.authors.get(row.authorId) ?? 0) + w);

    // Group
    if (row.groupId) {
      profile.groups.set(row.groupId, (profile.groups.get(row.groupId) ?? 0) + w);
    }

    profile.totalWeight += Math.abs(w);
  }

  // Not enough signal yet → fall back to chronological
  if (profile.totalWeight < 3) return null;

  return profile;
}

/**
 * Score a single post given an interest profile.
 * Higher is better.
 */
export function scorePost(post: Post, profile: InterestProfile): number {
  let score = 0;

  // ── Hashtag match ──────────────────────────────────────────────────────
  for (const tag of post.hashtags) {
    const tagScore = profile.hashtags.get(tag) ?? 0;
    if (tagScore > 0) score += tagScore * 3;
  }

  // ── Media type preference ──────────────────────────────────────────────
  if (post.mediaType) {
    const mtScore = profile.mediaType.get(post.mediaType) ?? 0;
    score += mtScore * 2;
  }

  // ── Author affinity ────────────────────────────────────────────────────
  const authorScore = profile.authors.get(post.authorId) ?? 0;
  score += authorScore * 2.5;

  // ── Group affinity ─────────────────────────────────────────────────────
  if (post.groupId) {
    const groupScore = profile.groups.get(post.groupId) ?? 0;
    score += groupScore * 2;
  }

  // ── Popularity boost ───────────────────────────────────────────────────
  score += Math.log1p(post.likesCount + post.commentsCount) * 1.5;

  // ── Recency decay (0–2 bonus points for posts < 14 days old) ──────────
  const ageMs = Date.now() - new Date(post.createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays < 14) {
    score += 2 * (1 - ageDays / 14);
  }

  return score;
}

/**
 * Sort a candidate pool by relevance for the given user.
 * Falls back to chronological order when the user has no history.
 */
export async function rankPosts(userId: string, posts: Post[]): Promise<Post[]> {
  const profile = await buildInterestProfile(userId);

  if (!profile) {
    // No history — keep chronological
    return posts;
  }

  return [...posts].sort((a, b) => scorePost(b, profile) - scorePost(a, profile));
}
