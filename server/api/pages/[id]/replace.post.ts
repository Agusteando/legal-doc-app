import { getDb } from '../../../utils/db';

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Page ID is required.' });

  try {
    const body = await readBody(event);
    if (!body) throw createError({ statusCode: 400, statusMessage: 'No JSON body received.' });

    const { image_url, thumbnail_url } = body;
    if (!image_url) throw createError({ statusCode: 400, statusMessage: 'Missing image_url field.' });

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
      [image_url, thumbnail_url || image_url, id]
    );

    return { success: true, image_url, thumbnail_url };
    
  } catch (err: any) {
    console.error(`[Server API ERROR] Exception in /pages/[id]/replace:`, err);
    throw createError({ statusCode: 500, statusMessage: err.message || 'Internal Replace Persistence Error' });
  }
});