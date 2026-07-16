import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";

export const storiesTable = sqliteTable("stories", {
  id: text("id").primaryKey(),
  authorId: text("author_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  mediaUrl: text("media_url").notNull(),
  mediaType: text("media_type").notNull(),
  trackingId: text("tracking_id"),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const storyViewsTable = sqliteTable("story_views", {
  storyId: text("story_id").notNull().references(() => storiesTable.id, { onDelete: "cascade" }),
  viewerId: text("viewer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  viewedAt: integer("viewed_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const storyReactionsTable = sqliteTable("story_reactions", {
  storyId: text("story_id").notNull().references(() => storiesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
}, (t) => [primaryKey({ columns: [t.storyId, t.userId] })]);

export type Story = typeof storiesTable.$inferSelect;
