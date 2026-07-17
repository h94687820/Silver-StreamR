/**
 * Cloudflare Pages Function — Clerk FAPI + NPM CDN Proxy
 *
 * Handles two kinds of requests routed through /api/__clerk/*:
 *   1. /api/__clerk/npm/*  → https://npm.clerk.dev/*   (Clerk JS bundle)
 *   2. /api/__clerk/*      → CLERK_FAPI/*              (Frontend API calls)
 *
 * When ClerkProvider is given a proxyUrl, Clerk routes ALL its network
 * traffic through that prefix — including loading its own JS bundle from
 * npm.clerk.dev.  Without routing the /npm/* sub-path to the CDN, the
 * browser gets a 404 / FAPI error and Clerk never initialises.
 */

interface Env {
  CLERK_SECRET_KEY: string;
  CLERK_FAPI: string;
}

const PROXY_PATH = "/api/__clerk";
const NPM_CDN   = "https://npm.clerk.dev";

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;

  const url = new URL(request.url);
  const stripped = url.pathname.replace(PROXY_PATH, "") || "/";

  // ── 1. npm CDN requests — /api/__clerk/npm/* → npm.clerk.dev/* ────────────
  if (stripped.startsWith("/npm/")) {
    const cdnUrl = `${NPM_CDN}${stripped}${url.search}`;

    const upstream = await fetch(cdnUrl, {
      method: request.method,
      headers: { "user-agent": request.headers.get("user-agent") || "" },
    });

    const resHeaders = new Headers(upstream.headers);
    resHeaders.delete("transfer-encoding");
    resHeaders.delete("connection");
    resHeaders.delete("keep-alive");
    // Allow the browser to cache the JS bundle
    if (!resHeaders.has("cache-control")) {
      resHeaders.set("cache-control", "public, max-age=31536000, immutable");
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: resHeaders,
    });
  }

  // ── 2. FAPI requests — /api/__clerk/* → CLERK_FAPI/* ─────────────────────
  if (!env.CLERK_SECRET_KEY) {
    return new Response(JSON.stringify({ error: "Clerk not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const fapiBase = (env.CLERK_FAPI || "https://frontend-api.clerk.dev").replace(/\/$/, "");
  const targetUrl = `${fapiBase}${stripped}${url.search}`;

  const fwdHost  = request.headers.get("x-forwarded-host") || url.host;
  const fwdProto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const proxyUrl = `${fwdProto}://${fwdHost}${PROXY_PATH}`;

  const outHeaders = new Headers(request.headers);
  outHeaders.set("host", new URL(fapiBase).host);
  outHeaders.set("clerk-proxy-url", proxyUrl);
  outHeaders.set("clerk-secret-key", env.CLERK_SECRET_KEY);
  outHeaders.delete("connection");
  outHeaders.delete("transfer-encoding");
  outHeaders.delete("keep-alive");

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers: outHeaders,
    body: hasBody ? request.body : undefined,
    // @ts-expect-error CF Workers support duplex
    duplex: hasBody ? "half" : undefined,
  });

  const resHeaders = new Headers(upstream.headers);
  resHeaders.delete("transfer-encoding");
  resHeaders.delete("connection");
  resHeaders.delete("keep-alive");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
};
