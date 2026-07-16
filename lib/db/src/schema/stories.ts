import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const storiesTable = pgTable("stories", {
  id: text("id").primaryKey(),
  authorId: text("author_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  mediaUrl: text("media_url").notNull(),
  mediaType: text("media_type").notNull(), // "image" | "video"
  trackingId: text("tracking_id"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const storyViewsTable = pgTable("story_views", {
  storyId: text("story_id").notNull().references(() => storiesTable.id, { onDelete: "cascade" }),
  viewerId: text("viewer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at").notNull().defaultNow(),
});

export const storyReactionsTable = pgTable("story_reactions", {
  storyId: text("story_id").notNull().references(() => storiesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "like" | "dislike"
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.storyId, t.userId] })]);

export type Story = typeof storiesTable.$inferSelect;
export type StoryView = typeof storyViewsTable.$inferSelect;
export type StoryReaction = typeof storyReactionsTable.$inferSelect;
