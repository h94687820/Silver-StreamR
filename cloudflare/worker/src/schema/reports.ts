import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";
import { postsTable } from "./posts";
import { commentsTable } from "./comments";

export const reportsTable = sqliteTable("reports", {
  id: text("id").primaryKey(),
  reporterId: text("reporter_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(), // 'post' | 'comment' | 'user'
  targetId: text("target_id").notNull(),
  postId: text("post_id").references(() => postsTable.id, { onDelete: "set null" }),
  commentId: text("comment_id").references(() => commentsTable.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'reviewed' | 'dismissed'
  reviewedBy: text("reviewed_by"),
  reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type Report = typeof reportsTable.$inferSelect;
