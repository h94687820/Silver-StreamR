import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";
import { postsTable } from "./posts";

export const savedPostsTable = sqliteTable("saved_posts", {
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  postId: text("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
  savedAt: integer("saved_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
}, (t) => [primaryKey({ columns: [t.userId, t.postId] })]);
