import { AwsClient } from "aws4fetch";

export function createStorageClient(
  accessKeyId: string,
  secretAccessKey: string,
  region = "auto",
) {
  return new AwsClient({ accessKeyId, secretAccessKey, region, service: "s3" });
}

export async function uploadFile(
  client: AwsClient,
  endpoint: string,
  bucket: string,
  publicUrl: string,
  body: ArrayBuffer,
  contentType: string,
  folder = "uploads",
): Promise<string> {
  const ext = contentType.split("/")[1]?.split("+")[0] ?? "bin";
  const key = `${folder}/${crypto.randomUUID()}.${ext}`;
  const url = `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;

  const resp = await client.fetch(url, {
    method: "PUT",
    body,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(body.byteLength),
    },
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Storage upload failed: ${resp.status} ${text}`);
  }

  return `${publicUrl.replace(/\/$/, "")}/${key}`;
}

export async function deleteFile(
  client: AwsClient,
  endpoint: string,
  bucket: string,
  publicUrl: string,
  fileUrl: string,
): Promise<void> {
  const base = publicUrl.replace(/\/$/, "");
  if (!fileUrl.startsWith(base + "/")) return; // not our file
  const key = fileUrl.slice(base.length + 1);
  const url = `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;
  await client.fetch(url, { method: "DELETE" });
}
