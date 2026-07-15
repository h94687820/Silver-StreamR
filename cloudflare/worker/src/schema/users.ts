import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  coverUrl: text("cover_url"),
  followersCount: integer("followers_count").notNull().default(0),
  followingCount: integer("following_count").notNull().default(0),
  postsCount: integer("posts_count").notNull().default(0),
  onboardingComplete: integer("onboarding_complete", { mode: "boolean" }).notNull().default(false),
  acceptedTerms: integer("accepted_terms", { mode: "boolean" }).notNull().default(false),
  profileBadgeEmojiId: text("profile_badge_emoji_id"),
  postStampEmojiId: text("post_stamp_emoji_id"),
  nameDisplayEmojiId: text("name_display_emoji_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type User = typeof usersTable.$inferSelect;
