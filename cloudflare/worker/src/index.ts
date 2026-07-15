import { Hono } from "hono";
import { cors } from "hono/cors";
import type { HonoEnv } from "./types";
import { getClerkIdFromHeader } from "./auth";

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

const app = new Hono<HonoEnv>();

// ── CORS ────────────────────────────────────────────────────────────────────
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Authorization", "Content-Type", "Accept"],
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    maxAge: 86400,
  }),
);

// ── Health ──────────────────────────────────────────────────────────────────
app.get("/api/healthz", (c) => c.json({ status: "ok" }));

// ── Auth middleware  (all /api/* except healthz + check-username) ───────────
app.use("/api/*", async (c, next) => {
  // Skip auth for a narrow public set
  const path = new URL(c.req.url).pathname;
  if (path === "/api/healthz" || path === "/api/users/check-username") {
    await next();
    return;
  }

  const authHeader = c.req.header("Authorization");
  const clerkId = await getClerkIdFromHeader(authHeader, c.env.CLERK_SECRET_KEY);
  if (!clerkId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("clerkId", clerkId);
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

// ── 404 catch-all ───────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
