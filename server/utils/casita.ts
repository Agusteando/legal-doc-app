import { useRuntimeConfig } from '#imports';

export async function uploadToCasita(buffer: Buffer, filename: string, mimetype: string): Promise<string> {
  const config = useRuntimeConfig();
  const formData = new FormData();
  
  const blob = new Blob([buffer], { type: mimetype });
  formData.append('file', blob, filename);

  const uploadUrl = new URL(config.storageUploadUrl);
  uploadUrl.searchParams.set('includeUrl', 'true');

  console.log(`[Casita Util] Dispatching file ${filename} (${buffer.length} bytes) to ${uploadUrl.origin}...`);

  const response = await fetch(uploadUrl.toString(), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    console.error(`[Casita Util ERROR] Upload failed. HTTP ${response.status} - ${response.statusText}`);
    throw new Error(`Casita Upload Failed: HTTP ${response.status} - ${response.statusText}`);
  }

  const text = await response.text();
  console.log(`[Casita Util] Raw response received. Length: ${text.length}`);
  
  let finalUrl = '';
  try {
    const json = JSON.parse(text);
    finalUrl = json.url || json.Url || json.URL || '';
  } catch {
    finalUrl = text.trim();
  }

  if (!finalUrl || !finalUrl.startsWith('http')) {
    console.error(`[Casita Util ERROR] Response did not contain a valid URL. Received snippet: ${text.substring(0, 100)}`);
    throw new Error(`Casita Error: Valid URL not returned. Received: ${text.substring(0, 50)}`);
  }

  console.log(`[Casita Util] Upload verified. URL: ${finalUrl}`);
  return finalUrl;
}