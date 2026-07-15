import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";
import { postsTable } from "./posts";

export const reactionsTable = sqliteTable("reactions", {
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  postId: text("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
}, (t) => [primaryKey({ columns: [t.userId, t.postId] })]);

export type Reaction = typeof reactionsTable.$inferSelect;
