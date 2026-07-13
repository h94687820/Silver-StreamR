import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const notificationsTable = pgTable("notifications", {
  id: text("id").primaryKey(),
  recipientId: text("recipient_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  actorId: text("actor_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "like" | "dislike" | "comment" | "follow" | "mention"
  postId: text("post_id"),
  commentId: text("comment_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
