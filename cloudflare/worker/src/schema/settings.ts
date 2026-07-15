import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";

export const userSettingsTable = sqliteTable("user_settings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  theme: text("theme").notNull().default("auto"),
  accentColor: text("accent_color").notNull().default("blue"),
  language: text("language").notNull().default("ar"),
  savedPostsPublic: integer("saved_posts_public", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});
