/**
 * FORGE Storage helpers (baas-server-model-a.mcfoxy.workers.dev)
 *
 * Flow:
 *  1. POST /api/v1/storage/upload  { name, size, contentType }
 *     → { uploadURL (relative), downloadUrl (absolute), fileId }
 *  2. PUT <forgeBase><uploadURL>  with raw binary
 *     → file is stored, downloadUrl is the public URL
 */

interface ForgeUploadInit {
  uploadURL: string;
  downloadUrl: string;
  fileId: number;
}

export async function uploadFile(
  forgeBase: string,
  forgeApiKey: string,
  body: ArrayBuffer,
  contentType: string,
  folder = "uploads",
): Promise<string> {
  const ext = contentType.split("/")[1]?.split("+")[0] ?? "bin";
  const name = `${folder}/${crypto.randomUUID()}.${ext}`;

  // 1 — طلب رابط الرفع
  const initResp = await fetch(`${forgeBase}/api/v1/storage/upload`, {
    method: "POST",
    headers: {
      "X-API-Key": forgeApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, size: body.byteLength, contentType }),
  });

  if (!initResp.ok) {
    const err = await initResp.text().catch(() => "");
    throw new Error(`FORGE upload init failed ${initResp.status}: ${err}`);
  }

  const { uploadURL, downloadUrl }: ForgeUploadInit = await initResp.json();

  // 2 — رفع البيانات الثنائية
  const putResp = await fetch(`${forgeBase}${uploadURL}`, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body,
  });

  if (!putResp.ok) {
    const err = await putResp.text().catch(() => "");
    throw new Error(`FORGE upload PUT failed ${putResp.status}: ${err}`);
  }

  return downloadUrl;
}

export async function deleteFile(
  forgeBase: string,
  forgeApiKey: string,
  fileUrl: string,
): Promise<void> {
  if (!fileUrl.startsWith(forgeBase)) return;

  // استخراج UUID من الرابط: .../objects/{uuid}
  const uuid = fileUrl.split("/objects/")[1]?.split("?")[0];
  if (!uuid) return;

  await fetch(`${forgeBase}/api/storage/objects/${uuid}`, {
    method: "DELETE",
    headers: { "X-API-Key": forgeApiKey },
  }).catch(() => {}); // حذف غير حرج — تجاهل الأخطاء
}
