/**
 * Cloudflare Pages Function — API Proxy
 *
 * يُوجّه كل طلبات /api/* إلى Cloudflare Worker (silver-stream-api).
 *
 * طريقتا الاتصال (بحسب ما هو مُهيّأ في Pages):
 *   1. Service Binding:  env.API  (مُوصى به — لا يحتاج URL خارجي)
 *   2. متغير بيئة:       env.WORKER_URL  (مثال: https://silver-stream-api.xxx.workers.dev)
 *
 * ملاحظة: مسار /api/__clerk/* تعالجه دالة منفصلة ولا يصل هنا.
 */

interface Env {
  API?: { fetch: (req: Request) => Promise<Response> }; // Service Binding
  WORKER_URL?: string;                                   // Fallback env var
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;

  // ── 1. Service Binding ───────────────────────────────────────────────────
  if (env.API) {
    return env.API.fetch(request);
  }

  // ── 2. WORKER_URL fallback ───────────────────────────────────────────────
  const workerBase = env.WORKER_URL?.replace(/\/$/, "");
  if (!workerBase) {
    return new Response(
      JSON.stringify({ error: "API not configured. Set WORKER_URL or API service binding in Cloudflare Pages." }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const url = new URL(request.url);
  const target = `${workerBase}${url.pathname}${url.search}`;

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  const upstream = await fetch(target, {
    method: request.method,
    headers: request.headers,
    body: hasBody ? request.body : undefined,
    // @ts-expect-error CF Workers support duplex streaming
    duplex: hasBody ? "half" : undefined,
  });

  // أعِد الاستجابة كما هي
  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
};
