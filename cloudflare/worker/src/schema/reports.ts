import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";

export const reportsTable = sqliteTable("reports", {
  id: text("id").primaryKey(),
  reporterId: text("reporter_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  mode: text("mode").notNull().default("specific"), // 'general' | 'specific'
  targetType: text("target_type").notNull(),          // 'post' | 'comment' | 'user' | 'group' | 'story'
  targetId: text("target_id").notNull().default(""),
  targetUsername: text("target_username"),
  reportType: text("report_type").notNull().default(""),
  description: text("description").notNull().default(""),
  // عمود قديم — لا يزال NOT NULL في D1 لذا يجب تمريره
  reason: text("reason").notNull().default(""),
  screenshotUrl: text("screenshot_url"),
  status: text("status").notNull().default("pending"), // 'pending' | 'reviewed' | 'dismissed'
  reviewedBy: text("reviewed_by"),
  reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export type Report = typeof reportsTable.$inferSelect;
