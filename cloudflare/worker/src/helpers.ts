import type { DB } from "./db";
import {
  usersTable,
  followsTable,
  blocksTable,
  reactionsTable,
  savedPostsTable,
  userSettingsTable,
  customEmojisTable,
  notificationsTable,
  postsTable,
} from "./schema";
import { eq, and, inArray } from "drizzle-orm";

const MENTION_REGEX = /@([a-zA-Z0-9_]{2,30})/g;
const HASHTAG_REGEX = /#([\p{L}\p{N}_]{2,50})/gu;

export function extractHashtags(content: string | null | undefined): string[] {
  if (!content) return [];
  const tags = Array.from(content.matchAll(HASHTAG_REGEX)).map((m) =>
    m[1].toLowerCase(),
  );
  return Array.from(new Set(tags));
}

export async function getUserProfile(
  db: DB,
  targetId: string,
  viewerId?: string | null,
) {
  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, targetId))
    .limit(1);
  if (!users[0]) return null;
  const user = users[0];

  let isFollowing = false;
  let isBlocked = false;

  if (viewerId && viewerId !== targetId) {
    const [follow, block] = await Promise.all([
      db
        .select()
        .from(followsTable)
        .where(
          and(
            eq(followsTable.followerId, viewerId),
            eq(followsTable.followingId, targetId),
          ),
        )
        .limit(1),
      db
        .select()
        .from(blocksTable)
        .where(
          and(
            eq(blocksTable.blockerId, viewerId),
            eq(blocksTable.blockedId, targetId),
          ),
        )
        .limit(1),
    ]);
    isFollowing = follow.length > 0;
    isBlocked = block.length > 0;
  }

  const settings = await db
    .select({ savedPostsPublic: userSettingsTable.savedPostsPublic })
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, targetId))
    .limit(1);
  const savedPostsPublic = settings[0]?.savedPostsPublic ?? false;

  const emojiIds = [
    user.profileBadgeEmojiId,
    user.postStampEmojiId,
    user.nameDisplayEmojiId,
  ].filter(Boolean) as string[];

  let profileBadgeEmojiUrl: string | null = null;
  let postStampEmojiUrl: string | null = null;
  let nameDisplayEmojiUrl: string | null = null;

  if (emojiIds.length > 0) {
    const emojis = await db
      .select()
      .from(customEmojisTable)
      .where(inArray(customEmojisTable.id, emojiIds));
    const emojiMap = new Map(emojis.map((e) => [e.id, e.imageUrl]));
    profileBadgeEmojiUrl = user.profileBadgeEmojiId
      ? (emojiMap.get(user.profileBadgeEmojiId) ?? null)
      : null;
    postStampEmojiUrl = user.postStampEmojiId
      ? (emojiMap.get(user.postStampEmojiId) ?? null)
      : null;
    nameDisplayEmojiUrl = user.nameDisplayEmojiId
      ? (emojiMap.get(user.nameDisplayEmojiId) ?? null)
      : null;
  }

  return {
    id: user.id,
    clerkId: user.id,
    username: user.username,
    displayName: user.displayName ?? null,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl ?? null,
    coverUrl: user.coverUrl ?? null,
    savedPostsPublic,
    followersCount: user.followersCount,
    followingCount: user.followingCount,
    postsCount: user.postsCount,
    isFollowing,
    isBlocked,
    isMe: viewerId === targetId,
    onboardingComplete: user.onboardingComplete,
    createdAt: user.createdAt.toISOString(),
    profileBadgeEmojiUrl,
    postStampEmojiUrl,
    nameDisplayEmojiUrl,
  };
}

export async function enrichPost(
  db: DB,
  post: typeof postsTable.$inferSelect,
  viewerId?: string | null,
) {
  const author = await getUserProfile(db, post.authorId, viewerId);

  let myReaction: string | null = null;
  let isSaved = false;

  if (viewerId) {
    const [reaction, saved] = await Promise.all([
      db
        .select()
        .from(reactionsTable)
        .where(
          and(
            eq(reactionsTable.userId, viewerId),
            eq(reactionsTable.postId, post.id),
          ),
        )
        .limit(1),
      db
        .select()
        .from(savedPostsTable)
        .where(
          and(
            eq(savedPostsTable.userId, viewerId),
            eq(savedPostsTable.postId, post.id),
          ),
        )
        .limit(1),
    ]);
    myReaction = reaction[0]?.type ?? null;
    isSaved = saved.length > 0;
  }

  return {
    id: post.id,
    authorId: post.authorId,
    author: author!,
    groupId: post.groupId ?? null,
    content: post.content ?? null,
    mediaUrls: post.mediaUrls ?? [],
    mediaType: post.mediaType ?? null,
    hashtags: post.hashtags ?? [],
    isPrivate: post.isPrivate,
    likesCount: post.likesCount,
    dislikesCount: post.dislikesCount,
    commentsCount: post.commentsCount,
    myReaction,
    isSaved,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

export async function notifyMentions(
  db: DB,
  opts: {
    content: string | null | undefined;
    actorId: string;
    postId?: string;
    commentId?: string;
  },
) {
  const { content, actorId, postId, commentId } = opts;
  if (!content) return;

  const usernames = Array.from(
    new Set(
      Array.from(content.matchAll(MENTION_REGEX)).map((m) =>
        m[1].toLowerCase(),
      ),
    ),
  );
  if (usernames.length === 0) return;

  const mentioned = await db
    .select()
    .from(usersTable)
    .where(inArray(usersTable.username, usernames));
  if (mentioned.length === 0) return;

  await db.insert(notificationsTable).values(
    mentioned
      .filter((u) => u.id !== actorId)
      .map((u) => ({
        id: crypto.randomUUID(),
        recipientId: u.id,
        actorId,
        type: "mention",
        postId: postId ?? null,
        commentId: commentId ?? null,
      })),
  );
}
