/**
 * FORGE Storage helpers (baas-server-model-a.mcfoxy.workers.dev)
 *
 * يستخدم Service Binding (env.FORGE_SERVICE) للاتصال المباشر بـ FORGE Worker
 * بدون HTTP — يتجنّب قيد Cloudflare 1042 الذي يمنع Worker→Worker HTTP.
 *
 * إذا لم يتوفر Service Binding (بيئة محلية) يرجع إلى HTTP عادي.
 */

interface ForgeUploadResponse {
  url: string;
  fileId: number;
  objectPath: string;
}

type ForgeService = { fetch: (req: Request) => Promise<Response> } | undefined;

async function forgePost(
  forgeBase: string,
  forgeService: ForgeService,
  path: string,
  init: RequestInit,
): Promise<Response> {
  const url = `${forgeBase}${path}`;
  if (forgeService) {
    // Service Binding — اتصال مباشر بدون HTTP (يتجاوز قيد 1042)
    return forgeService.fetch(new Request(url, init));
  }
  // Fallback: HTTP عادي (يعمل من خارج Cloudflare مثل Replit dev)
  return fetch(url, init);
}

export async function uploadFile(
  forgeBase: string,
  forgeApiKey: string,
  body: ArrayBuffer,
  contentType: string,
  forgeService?: ForgeService,
): Promise<string> {
  const ext = contentType.split("/")[1]?.split("+")[0] ?? "bin";
  const filename = `upload.${ext}`;

  const formData = new FormData();
  const blob = new Blob([body], { type: contentType });
  formData.append("file", blob, filename);

  const resp = await forgePost(forgeBase, forgeService, "/api/storage/upload", {
    method: "POST",
    headers: { "X-API-Key": forgeApiKey },
    body: formData,
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    throw new Error(`FORGE upload failed ${resp.status}: ${err}`);
  }

  const { objectPath, url }: ForgeUploadResponse = await resp.json();
  return objectPath ?? url;
}

export async function deleteFile(
  forgeBase: string,
  forgeApiKey: string,
  fileUrl: string,
  forgeService?: ForgeService,
): Promise<void> {
  const uuid = fileUrl.split("/objects/")[1]?.split("?")[0];
  if (!uuid) return;

  await forgePost(forgeBase, forgeService, `/api/storage/objects/${uuid}`, {
    method: "DELETE",
    headers: { "X-API-Key": forgeApiKey },
  }).catch(() => {});
}
