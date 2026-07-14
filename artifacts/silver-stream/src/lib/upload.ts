/**
 * uploadFile — uploads a File through the API server (no direct GCS CORS issues).
 *
 * Sends the raw file body to POST /api/storage/uploads and returns the
 * objectPath that can be used to build the serving URL:
 *   `/api/storage${objectPath}`
 */
export async function uploadFile(file: File): Promise<string> {
  const res = await fetch("/api/storage/uploads", {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
    credentials: "include",
  });

  if (!res.ok) {
    let msg = `Upload failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {}
    throw new Error(msg);
  }

  const { objectPath } = (await res.json()) as { objectPath: string };
  if (!objectPath) throw new Error("Server returned no objectPath");
  return objectPath;
}

/**
 * Convenience wrapper that returns the full serving URL ready to use in <img> / <video>.
 */
export async function uploadFileAndGetUrl(file: File): Promise<string> {
  const objectPath = await uploadFile(file);
  return `/api/storage${objectPath}`;
}
