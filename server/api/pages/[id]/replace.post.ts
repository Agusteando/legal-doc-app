import { getDb } from '../../../utils/db';
import { uploadToCasita } from '../../../utils/casita';

export default defineEventHandler(async (event) => {
  console.log(`[Server API] POST /pages/${event.context.params?.id}/replace - Request received.`);
  const id = event.context.params?.id;
  
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Page ID is required.' });
  }

  try {
    const formData = await readMultipartFormData(event);
    if (!formData || formData.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'No file data received in payload.' });
    }

    const fileField = formData.find(f => f.name === 'file');
    if (!fileField) {
      throw createError({ statusCode: 400, statusMessage: 'Missing file field.' });
    }

    console.log(`[Server API] Delegating page replacement visual to Casita...`);
    const imageUrl = await uploadToCasita(fileField.data, `replace_${id}.png`, 'image/png');

    const db = getDb();
    
    console.log(`[Server API] Nullifying downstream page data and applying visual replace...`);
    await db.query(
      `UPDATE pages 
       SET image_url = ?, 
           status = 'pending_review', 
           extracted_json = NULL, 
           source_text = NULL, 
           translated_text = NULL, 
           job_status = 'idle',
           job_duration_sec = 0,
           job_error = NULL,
           is_stale = FALSE,
           is_manual_translation = FALSE
       WHERE id = ?`,
      [imageUrl, id]
    );

    return { success: true, image_url: imageUrl };
    
  } catch (err: any) {
    console.error(`[Server API ERROR] Exception in /pages/[id]/replace:`, err);
    throw createError({ statusCode: 500, statusMessage: err.message || 'Internal Replace Error' });
  }
});