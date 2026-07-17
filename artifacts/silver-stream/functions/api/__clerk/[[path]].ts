/**
 * Cloudflare Pages Function — Clerk FAPI + NPM CDN Proxy
 *
 * Handles two kinds of requests routed through /api/__clerk/*:
 *   1. /api/__clerk/npm/*  → https://npm.clerk.dev/*   (Clerk JS bundle)
 *   2. /api/__clerk/*      → CLERK_FAPI/*              (Frontend API calls)
 *
 * When ClerkProvider is given proxyUrl="/api/__clerk", Clerk routes ALL its
 * network traffic through that prefix — including loading its own JS bundle.
 * Without routing /npm/* sub-path to npm.clerk.dev the browser gets a 404
 * and Clerk never initialises.
 */

interface Env {
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY?: string;
  VITE_CLERK_PUBLISHABLE_KEY?: string;
  CLERK_FAPI?: string;
}

const PROXY_PATH = "/api/__clerk";
const NPM_CDN    = "https://npm.clerk.dev";

/**
 * Derive the Clerk FAPI base URL from a publishable key.
 * Format: pk_test_<base64(fapi_host$)> → https://<fapi_host>
 */
function fapiFromKey(key: string): string | null {
  try {
    const encoded = key.replace(/^pk_(test|live)_/, "");
    const padded  = encoded + "=".repeat((4 - (encoded.length % 4)) % 4);
    const decoded = atob(padded).replace(/\$+$/, "");
    if (decoded.includes(".")) return `https://${decoded}`;
  } catch {
    // fall through
  }
  return null;
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;

  const url      = new URL(request.url);
  const stripped = url.pathname.replace(PROXY_PATH, "") || "/";

  // ── 1. npm CDN requests — /api/__clerk/npm/* → npm.clerk.dev/* ────────────
  if (stripped.startsWith("/npm/")) {
    const cdnPath = stripped.slice("/npm".length); // "/npm/@clerk/..." → "/@clerk/..."
    const cdnUrl  = `${NPM_CDN}${cdnPath}${url.search}`;

    const upstream = await fetch(cdnUrl, {
      method:  request.method,
      headers: { "user-agent": request.headers.get("user-agent") || "" },
    });

    const resHeaders = new Headers(upstream.headers);
    resHeaders.delete("transfer-encoding");
    resHeaders.delete("connection");
    resHeaders.delete("keep-alive");
    if (!resHeaders.has("cache-control")) {
      resHeaders.set("cache-control", "public, max-age=31536000, immutable");
    }

    return new Response(upstream.body, { status: upstream.status, headers: resHeaders });
  }

  // ── 2. FAPI requests — /api/__clerk/* → Clerk Frontend API ───────────────
  if (!env.CLERK_SECRET_KEY) {
    return new Response(JSON.stringify({ error: "Clerk not configured" }), {
      status:  500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Resolve FAPI base URL — explicit env var wins, then derive from publishable key
  const pubKey =
    env.CLERK_PUBLISHABLE_KEY || env.VITE_CLERK_PUBLISHABLE_KEY || "";
  const fapiBase = (
    env.CLERK_FAPI ||
    fapiFromKey(pubKey) ||
    "https://frontend-api.clerk.dev"
  ).replace(/\/$/, "");

  const targetUrl = `${fapiBase}${stripped}${url.search}`;

  // Build Clerk-Proxy-Url from the actual request host
  const fwdHost  = request.headers.get("x-forwarded-host") || url.host;
  const fwdProto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const proxyUrl = `${fwdProto}://${fwdHost}${PROXY_PATH}`;

  const outHeaders = new Headers(request.headers);
  outHeaders.set("host",             new URL(fapiBase).host);
  outHeaders.set("clerk-proxy-url",  proxyUrl);
  outHeaders.set("clerk-secret-key", env.CLERK_SECRET_KEY);
  outHeaders.delete("connection");
  outHeaders.delete("transfer-encoding");
  outHeaders.delete("keep-alive");

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  const upstream = await fetch(targetUrl, {
    method:   request.method,
    headers:  outHeaders,
    body:     hasBody ? request.body : undefined,
    // @ts-expect-error CF Workers support duplex streaming
    duplex:   hasBody ? "half" : undefined,
    // Must NOT follow redirects — Clerk uses 307 redirects during dev-browser
    // initialization to deliver the __clerk_db_jwt token back to the browser.
    // If we follow the redirect here, the browser never receives the token and
    // stays in a perpetual "dev_browser_unauthenticated" loop → sign-up fails.
    redirect: "manual",
  });

  const resHeaders = new Headers(upstream.headers);
  resHeaders.delete("transfer-encoding");
  resHeaders.delete("connection");
  resHeaders.delete("keep-alive");

  // For redirects, forward status + Location as-is so the browser follows them.
  // opaqueredirect = a manual redirect response from CF fetch; upstream.status = 0
  // in that case, read the real status from the response type.
  const status = upstream.type === "opaqueredirect" ? 307 : upstream.status;

  return new Response(
    status >= 300 && status < 400 ? null : upstream.body,
    { status, headers: resHeaders },
  );
};
