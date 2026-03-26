import { getDb } from '../../../utils/db';
import { uploadToCasita } from '../../../utils/casita';

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Page ID is required.' });

  try {
    const formData = await readMultipartFormData(event);
    if (!formData || formData.length === 0) throw createError({ statusCode: 400, statusMessage: 'No file data received.' });

    const fileField = formData.find(f => f.name === 'file');
    const fileThumbField = formData.find(f => f.name === 'file_thumb');
    if (!fileField) throw createError({ statusCode: 400, statusMessage: 'Missing file field.' });

    const [imageUrl, thumbnailUrl] = await Promise.all([
      uploadToCasita(fileField.data, `replace_${id}.jpg`, 'image/jpeg'),
      fileThumbField ? uploadToCasita(fileThumbField.data, `replace_thumb_${id}.jpg`, 'image/jpeg') : Promise.resolve(null)
    ]);

    const db = getDb();
    
    await db.query(
      `UPDATE pages 
       SET image_url = ?, 
           thumbnail_url = ?,
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
      [imageUrl, thumbnailUrl || imageUrl, id]
    );

    return { success: true, image_url: imageUrl, thumbnail_url: thumbnailUrl };
    
  } catch (err: any) {
    console.error(`[Server API ERROR] Exception in /pages/[id]/replace:`, err);
    throw createError({ statusCode: 500, statusMessage: err.message || 'Internal Replace Error' });
  }
});