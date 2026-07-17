/**
 * Clerk FAPI Proxy for Cloudflare Worker
 *
 * Proxies Clerk Frontend API requests through the Worker domain so that
 * silver-stream.pages.dev can authenticate with the Clerk dev instance.
 * Without this, Clerk returns "dev_browser_unauthenticated" for any FAPI call.
 */
import { Hono } from "hono";
import type { HonoEnv } from "../types";

const CLERK_PROXY_PATH = "/api/__clerk";

/**
 * Derive the Clerk FAPI base URL from the publishable key.
 * pk_test_<base64(fapi_host$)> → https://<fapi_host>
 */
function getFapiUrl(publishableKey: string): string {
  try {
    // key format: pk_test_<b64> or pk_live_<b64>
    const encoded = publishableKey.replace(/^pk_(test|live)_/, "");
    // base64 may be missing padding
    const padded = encoded + "=".repeat((4 - (encoded.length % 4)) % 4);
    const decoded = atob(padded).replace(/\$+$/, "");
    if (decoded.includes(".")) return `https://${decoded}`;
  } catch {
    // fall through to default
  }
  return "https://frontend-api.clerk.dev";
}

const clerkProxy = new Hono<HonoEnv>();

clerkProxy.all("/*", async (c) => {
  const secretKey = c.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    return c.json({ error: "Clerk not configured" }, 500);
  }

  // Use the env var directly — avoids base64 parse failures
  const fapiBase = c.env.CLERK_FAPI || "https://frontend-api.clerk.dev";

  // Strip /api/__clerk prefix to get the real FAPI path
  const reqUrl = new URL(c.req.url);
  const strippedPath =
    reqUrl.pathname.replace(CLERK_PROXY_PATH, "") || "/";

  // ── npm CDN requests: /api/__clerk/npm/* → npm.clerk.dev/* ────────────────
  // Clerk routes its JS bundle through the proxy URL prefix. Forward these to
  // the npm CDN directly — they do NOT go to the FAPI.
  if (strippedPath.startsWith("/npm/")) {
    const cdnPath = strippedPath.slice("/npm".length); // "/npm/@clerk/..." → "/@clerk/..."
    const cdnUrl = `https://npm.clerk.dev${cdnPath}${reqUrl.search}`;
    const npmRes = await fetch(cdnUrl, {
      method: "GET",
      headers: { "user-agent": c.req.header("user-agent") || "" },
    });
    const resH = new Headers(npmRes.headers);
    resH.delete("transfer-encoding");
    resH.delete("connection");
    resH.delete("keep-alive");
    if (!resH.has("cache-control")) {
      resH.set("cache-control", "public, max-age=31536000, immutable");
    }
    return new Response(npmRes.body, { status: npmRes.status, headers: resH });
  }

  const targetUrl = `${fapiBase}${strippedPath}${reqUrl.search}`;

  // Build Clerk-Proxy-Url from the incoming request host
  const fwdHost = c.req.header("x-forwarded-host") || c.req.header("host") || "";
  const fwdProto = c.req.header("x-forwarded-proto") || "https";
  const proxyUrl = `${fwdProto}://${fwdHost}${CLERK_PROXY_PATH}`;

  // Forward headers — replace Host so the upstream accepts the request
  const outHeaders = new Headers(c.req.raw.headers);
  outHeaders.set("host", new URL(fapiBase).host);
  outHeaders.set("clerk-proxy-url", proxyUrl);
  outHeaders.set("clerk-secret-key", secretKey);
  // Remove hop-by-hop headers that must not be forwarded
  outHeaders.delete("connection");
  outHeaders.delete("transfer-encoding");
  outHeaders.delete("keep-alive");

  const hasBody = c.req.method !== "GET" && c.req.method !== "HEAD";

  const upstream = await fetch(targetUrl, {
    method: c.req.method,
    headers: outHeaders,
    body: hasBody ? c.req.raw.body : undefined,
    // @ts-expect-error — CF Workers support duplex streaming
    duplex: hasBody ? "half" : undefined,
  });

  // Forward response — strip hop-by-hop headers
  const resHeaders = new Headers(upstream.headers);
  resHeaders.delete("transfer-encoding");
  resHeaders.delete("connection");
  resHeaders.delete("keep-alive");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
});

export default clerkProxy;
