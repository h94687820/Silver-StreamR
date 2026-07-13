import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { postsTable } from "./posts";

export const savedPostsTable = pgTable("saved_posts", {
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  postId: text("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
  savedAt: timestamp("saved_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.postId] })]);

export type SavedPost = typeof savedPostsTable.$inferSelect;
