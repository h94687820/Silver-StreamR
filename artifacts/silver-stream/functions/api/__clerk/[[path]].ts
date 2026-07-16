/**
 * Cloudflare Pages Function — Clerk FAPI Proxy
 *
 * Runs on silver-stream.pages.dev/api/__clerk/* (same domain as the frontend),
 * so Clerk's dev-browser cookies are first-party and the browser sets them correctly.
 *
 * Required env vars (set in Pages project settings):
 *   CLERK_SECRET_KEY  – secret key matching the published frontend key
 *   CLERK_FAPI        – Clerk FAPI base URL (e.g. https://vital-fox-43.clerk.accounts.dev)
 */

interface Env {
  CLERK_SECRET_KEY: string;
  CLERK_FAPI: string;
}

const PROXY_PATH = "/api/__clerk";

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;

  if (!env.CLERK_SECRET_KEY) {
    return new Response(JSON.stringify({ error: "Clerk not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const fapiBase = (env.CLERK_FAPI || "https://frontend-api.clerk.dev").replace(/\/$/, "");

  // Strip /api/__clerk prefix to get the real FAPI path
  const url = new URL(request.url);
  const strippedPath = url.pathname.replace(PROXY_PATH, "") || "/";
  const targetUrl = `${fapiBase}${strippedPath}${url.search}`;

  // Build Clerk-Proxy-Url from the incoming request
  const fwdHost = request.headers.get("x-forwarded-host") || url.host;
  const fwdProto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const proxyUrl = `${fwdProto}://${fwdHost}${PROXY_PATH}`;

  // Forward headers
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

  // Forward response — strip hop-by-hop headers
  const resHeaders = new Headers(upstream.headers);
  resHeaders.delete("transfer-encoding");
  resHeaders.delete("connection");
  resHeaders.delete("keep-alive");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
};
