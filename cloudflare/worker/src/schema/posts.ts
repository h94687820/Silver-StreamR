import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";
import { groupsTable } from "./groups";

export const postsTable = sqliteTable("posts", {
  id: text("id").primaryKey(),
  authorId: text("author_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  groupId: text("group_id").references(() => groupsTable.id, { onDelete: "cascade" }),
  content: text("content"),
  mediaUrls: text("media_urls", { mode: "json" }).$type<string[]>().notNull().default([]),
  mediaType: text("media_type"),
  hashtags: text("hashtags", { mode: "json" }).$type<string[]>().notNull().default([]),
  isPrivate: integer("is_private", { mode: "boolean" }).notNull().default(false),
  likesCount: integer("likes_count").notNull().default(0),
  dislikesCount: integer("dislikes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  trackingId: text("tracking_id"),
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type Post = typeof postsTable.$inferSelect;
