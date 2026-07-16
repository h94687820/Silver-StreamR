import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const reportsTable = pgTable("reports", {
  id: text("id").primaryKey(),
  reporterId: text("reporter_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  mode: text("mode").notNull(), // 'general' | 'specific'
  targetType: text("target_type").notNull(), // 'post' | 'comment' | 'user' | 'group' | 'story'
  targetId: text("target_id").notNull().default(""),
  targetUsername: text("target_username"),
  reportType: text("report_type").notNull(),
  description: text("description").notNull(),
  screenshotUrl: text("screenshot_url"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Report = typeof reportsTable.$inferSelect;
export type NewReport = typeof reportsTable.$inferInsert;
