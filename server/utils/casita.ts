import { useRuntimeConfig } from '#imports';

export async function uploadToCasita(buffer: Buffer, filename: string, mimetype: string): Promise<string> {
  const config = useRuntimeConfig();
  const formData = new FormData();
  
  const blob = new Blob([buffer], { type: mimetype });
  formData.append('file', blob, filename);

  const uploadUrl = new URL(config.storageUploadUrl);
  uploadUrl.searchParams.set('includeUrl', 'true');

  const response = await fetch(uploadUrl.toString(), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload to Casita failed with status: ${response.status} - ${response.statusText}`);
  }

  const text = await response.text();
  let finalUrl = '';

  try {
    const json = JSON.parse(text);
    finalUrl = json.url || json.Url || json.URL || '';
  } catch {
    finalUrl = text.trim();
  }

  if (!finalUrl || !finalUrl.startsWith('http')) {
    throw new Error(`Storage error: No valid image URL returned from upload. Received: ${text.substring(0, 100)}`);
  }

  return finalUrl;
}