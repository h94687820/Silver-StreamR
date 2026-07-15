import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";

export const blocksTable = sqliteTable("blocks", {
  blockerId: text("blocker_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  blockedId: text("blocked_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
}, (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] })]);
