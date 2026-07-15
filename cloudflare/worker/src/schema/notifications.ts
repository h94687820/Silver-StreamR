import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";

export const notificationsTable = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  recipientId: text("recipient_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  actorId: text("actor_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  postId: text("post_id"),
  commentId: text("comment_id"),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type Notification = typeof notificationsTable.$inferSelect;
