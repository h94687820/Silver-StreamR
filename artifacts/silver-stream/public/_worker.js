/**
 * Cloudflare Pages Advanced Mode Worker
 *
 * يتولى توجيه الطلبات:
 *   /api/*  → Cloudflare Worker (silver-stream-api) عبر Service Binding "API"
 *   /*      → الملفات الثابتة (SPA) مع fallback إلى index.html
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── توجيه كل /api/* إلى الـ Worker ─────────────────────────────────────
    if (url.pathname.startsWith('/api/')) {
      if (env.API) {
        return env.API.fetch(request);
      }
      // Fallback: WORKER_URL env var
      if (env.WORKER_URL) {
        const base = env.WORKER_URL.replace(/\/$/, '');
        const target = `${base}${url.pathname}${url.search}`;
        const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
        return fetch(target, {
          method: request.method,
          headers: request.headers,
          body: hasBody ? request.body : undefined,
          duplex: hasBody ? 'half' : undefined,
        });
      }
      return new Response(
        JSON.stringify({ error: 'API not configured. Set API service binding or WORKER_URL.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // ── خدمة الملفات الثابتة مع SPA fallback ────────────────────────────────
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status === 404) {
      const indexUrl = new URL('/index.html', request.url);
      return env.ASSETS.fetch(new Request(indexUrl, request));
    }
    return assetResponse;
  },
};
