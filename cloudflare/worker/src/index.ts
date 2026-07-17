import { Hono } from "hono";
import { cors } from "hono/cors";
import type { HonoEnv } from "./types";
import { getClerkIdFromHeader, isAdminKey, canViewDeleted, isPostsKey, isVideosKey, isStoriesKey, isGroupsKey } from "./auth";

import clerkProxy from "./routes/clerk-proxy";
import usersRouter from "./routes/users";
import postsRouter from "./routes/posts";
import commentsRouter from "./routes/comments";
import reactionsRouter from "./routes/reactions";
import followsRouter from "./routes/follows";
import blocksRouter from "./routes/blocks";
import notificationsRouter from "./routes/notifications";
import chatRouter from "./routes/chat";
import searchRouter from "./routes/search";
import settingsRouter from "./routes/settings";
import storageRouter from "./routes/storage-route";
import storiesRouter from "./routes/stories";
import groupsRouter from "./routes/groups";
import emojisRouter from "./routes/emojis";
import devPortalRouter from "./routes/dev-portal";
import reportsRouter from "./routes/reports";
import adminRouter from "./routes/admin";

const app = new Hono<HonoEnv>();

// ── CORS ────────────────────────────────────────────────────────────────────
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Authorization", "Content-Type", "Accept", "X-Dev-Portal-Key", "X-Admin-Key", "X-Posts-Key", "X-Videos-Key", "X-Stories-Key", "X-Groups-Key"],
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    maxAge: 86400,
  }),
);

// ── Health ──────────────────────────────────────────────────────────────────
app.get("/api/healthz", (c) => c.json({ status: "ok" }));

// ── Clerk FAPI proxy (must be before auth middleware) ───────────────────────
app.route("/api/__clerk", clerkProxy);

// ── Auth middleware ──────────────────────────────────────────────────────────
app.use("/api/*", async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (
    path === "/api/healthz" ||
    path === "/api/users/check-username" ||
    path.startsWith("/api/__clerk")
  ) {
    await next();
    return;
  }

  const adminKey = c.req.header("X-Admin-Key");

  // ── مفتاح المشرف الكامل: وصول شامل ─────────────────────────────────────
  if (isAdminKey(adminKey)) {
    c.set("clerkId", "admin");
    c.set("isAdmin", true);
    c.set("canSeeDeleted", true);
    c.set("isPostsViewer", false);
    c.set("isVideosViewer", false);
    c.set("isStoriesViewer", false);
    c.set("isGroupsViewer", false);
    await next();
    return;
  }

  // ── مفتاح المنشورات: قراءة كاملة للمنشورات ──────────────────────────────
  const xPostsKey = c.req.header("X-Posts-Key") ?? c.req.header("Authorization")?.replace("Bearer ", "");
  if (isPostsKey(xPostsKey, c.env.POSTS_API_KEY)) {
    c.set("clerkId", "posts-viewer");
    c.set("isAdmin", false);
    c.set("canSeeDeleted", false);
    c.set("isPostsViewer", true);
    c.set("isVideosViewer", false);
    c.set("isStoriesViewer", false);
    c.set("isGroupsViewer", false);
    await next();
    return;
  }

  // ── مفتاح الفيديوهات: قراءة كاملة للفيديوهات ────────────────────────────
  const xVideosKey = c.req.header("X-Videos-Key") ?? c.req.header("Authorization")?.replace("Bearer ", "");
  if (isVideosKey(xVideosKey, c.env.VIDEOS_API_KEY)) {
    c.set("clerkId", "videos-viewer");
    c.set("isAdmin", false);
    c.set("canSeeDeleted", false);
    c.set("isPostsViewer", false);
    c.set("isVideosViewer", true);
    c.set("isStoriesViewer", false);
    c.set("isGroupsViewer", false);
    await next();
    return;
  }

  // ── مفتاح القصص: قراءة كاملة للقصص ─────────────────────────────────────
  const xStoriesKey = c.req.header("X-Stories-Key") ?? c.req.header("Authorization")?.replace("Bearer ", "");
  if (isStoriesKey(xStoriesKey, c.env.STORIES_API_KEY)) {
    c.set("clerkId", "stories-viewer");
    c.set("isAdmin", false);
    c.set("canSeeDeleted", false);
    c.set("isPostsViewer", false);
    c.set("isVideosViewer", false);
    c.set("isStoriesViewer", true);
    c.set("isGroupsViewer", false);
    await next();
    return;
  }

  // ── مفتاح المجموعات: قراءة كاملة للمجموعات ──────────────────────────────
  const xGroupsKey = c.req.header("X-Groups-Key") ?? c.req.header("Authorization")?.replace("Bearer ", "");
  if (isGroupsKey(xGroupsKey, c.env.GROUPS_API_KEY)) {
    c.set("clerkId", "groups-viewer");
    c.set("isAdmin", false);
    c.set("canSeeDeleted", false);
    c.set("isPostsViewer", false);
    c.set("isVideosViewer", false);
    c.set("isStoriesViewer", false);
    c.set("isGroupsViewer", true);
    await next();
    return;
  }

  // ── مفتاح الحذف: يرى المحذوف فقط، يحتاج Clerk للباقي ───────────────────
  const hasDeleteKey = canViewDeleted(adminKey);

  const authHeader = c.req.header("Authorization");
  const clerkId = await getClerkIdFromHeader(authHeader, c.env.CLERK_SECRET_KEY);

  if (!clerkId && !hasDeleteKey) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("clerkId", clerkId ?? "delete-viewer");
  c.set("isAdmin", false);
  c.set("canSeeDeleted", hasDeleteKey);
  c.set("isPostsViewer", false);
  c.set("isVideosViewer", false);
  c.set("isStoriesViewer", false);
  c.set("isGroupsViewer", false);
  await next();
});

// ── Routes ──────────────────────────────────────────────────────────────────
app.route("/api", usersRouter);
app.route("/api", postsRouter);
app.route("/api", commentsRouter);
app.route("/api", reactionsRouter);
app.route("/api", followsRouter);
app.route("/api", blocksRouter);
app.route("/api", notificationsRouter);
app.route("/api", chatRouter);
app.route("/api", searchRouter);
app.route("/api", settingsRouter);
app.route("/api", storageRouter);
app.route("/api", storiesRouter);
app.route("/api", groupsRouter);
app.route("/api", emojisRouter);
app.route("/api", reportsRouter);

// ── Admin routes (مفتاح المشرف الكامل فقط) ──────────────────────────────────
app.route("/api", adminRouter);

// ── Dev Portal ───────────────────────────────────────────────────────────────
app.route("/", devPortalRouter);

// ── 404 ──────────────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
