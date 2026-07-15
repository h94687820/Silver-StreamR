/**
 * Cloudflare R2 storage helpers.
 * The R2Bucket binding is passed in from the Worker env (c.env.STORAGE).
 */

export async function uploadFile(
  bucket: R2Bucket,
  publicUrl: string,
  body: ArrayBuffer,
  contentType: string,
  folder = "uploads",
): Promise<string> {
  const ext = contentType.split("/")[1]?.split("+")[0] ?? "bin";
  const key = `${folder}/${crypto.randomUUID()}.${ext}`;

  await bucket.put(key, body, {
    httpMetadata: { contentType },
  });

  return `${publicUrl.replace(/\/$/, "")}/${key}`;
}

export async function deleteFile(
  bucket: R2Bucket,
  publicUrl: string,
  fileUrl: string,
): Promise<void> {
  const base = publicUrl.replace(/\/$/, "");
  if (!fileUrl.startsWith(base + "/")) return; // ليس ملفنا
  const key = fileUrl.slice(base.length + 1);
  await bucket.delete(key);
}
