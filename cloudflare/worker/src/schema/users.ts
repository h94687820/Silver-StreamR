import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  coverUrl: text("cover_url"),
  followersCount: integer("followers_count").notNull().default(0),
  followingCount: integer("following_count").notNull().default(0),
  postsCount: integer("posts_count").notNull().default(0),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  acceptedTerms: boolean("accepted_terms").notNull().default(false),
  profileBadgeEmojiId: text("profile_badge_emoji_id"),
  postStampEmojiId: text("post_stamp_emoji_id"),
  nameDisplayEmojiId: text("name_display_emoji_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
