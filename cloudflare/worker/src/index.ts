import { Hono } from "hono";
import { cors } from "hono/cors";
import type { HonoEnv } from "./types";
import { getClerkIdFromHeader, isAdminKey, canViewDeleted } from "./auth";

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
    allowHeaders: ["Authorization", "Content-Type", "Accept", "X-Dev-Portal-Key", "X-Admin-Key"],
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
    await next();
    return;
  }

  // ── مفتاح الحذف: يرى المحذوف فقط، يحتاج Clerk للباقي ───────────────────
  const hasDeleteKey = canViewDeleted(adminKey); // يشمل مفتاح الحذف فقط هنا

  const authHeader = c.req.header("Authorization");
  const clerkId = await getClerkIdFromHeader(authHeader, c.env.CLERK_SECRET_KEY);

  if (!clerkId && !hasDeleteKey) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("clerkId", clerkId ?? "delete-viewer");
  c.set("isAdmin", false);
  c.set("canSeeDeleted", hasDeleteKey);
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
