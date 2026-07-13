import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { groupsTable } from "./groups";

export const postsTable = pgTable("posts", {
  id: text("id").primaryKey(),
  authorId: text("author_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  groupId: text("group_id").references(() => groupsTable.id, { onDelete: "cascade" }),
  content: text("content"),
  mediaUrls: text("media_urls").array().notNull().default([]),
  mediaType: text("media_type"), // "image" | "video"
  isPrivate: boolean("is_private").notNull().default(false),
  likesCount: integer("likes_count").notNull().default(0),
  dislikesCount: integer("dislikes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPostSchema = createInsertSchema(postsTable).omit({ createdAt: true, updatedAt: true });
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof postsTable.$inferSelect;
