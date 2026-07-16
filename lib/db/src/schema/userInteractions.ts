import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { postsTable } from "./posts";

export const userInteractionsTable = pgTable(
  "user_interactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => postsTable.id, { onDelete: "cascade" }),
    /** "view" | "like" | "dislike" | "comment" | "save" */
    action: text("action").notNull(),
    mediaType: text("media_type"), // "image" | "video" | null
    hashtags: text("hashtags").array().notNull().default([]),
    groupId: text("group_id"),
    authorId: text("author_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index("ui_user_created_idx").on(t.userId, t.createdAt),
    userPostActionIdx: index("ui_user_post_action_idx").on(t.userId, t.postId, t.action),
  }),
);

export type UserInteraction = typeof userInteractionsTable.$inferSelect;
