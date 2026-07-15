import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";

export const followsTable = sqliteTable("follows", {
  followerId: text("follower_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  followingId: text("following_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
}, (t) => [primaryKey({ columns: [t.followerId, t.followingId] })]);

export type Follow = typeof followsTable.$inferSelect;
