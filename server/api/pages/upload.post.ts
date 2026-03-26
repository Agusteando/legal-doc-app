import { getDb } from '../../utils/db';
import { randomUUID } from 'crypto';

export default defineEventHandler(async (event) => {
  console.log(`[Server API] POST /pages/upload - Request received (Direct JSON).`);
  
  try {
    const body = await readBody(event);
    if (!body) {
      throw createError({ statusCode: 400, statusMessage: 'No payload received.' });
    }

    const { document_id, page_number, source_filename, image_url, thumbnail_url } = body;

    if (!document_id || !page_number || !source_filename || !image_url) {
      throw createError({ statusCode: 400, statusMessage: 'Missing required metadata fields.' });
    }

    const db = getDb();
    const pageId = randomUUID();

    // Calculate next_order explicitly ignoring deleted rows to prevent ghost jumps
    const [orderRes]: any = await db.query(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM pages WHERE document_id = ? AND is_deleted = FALSE`, [document_id]);
    const nextOrder = orderRes[0].next_order;

    await db.query(
      `INSERT INTO pages (id, document_id, source_filename, page_number, sort_order, image_url, thumbnail_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_review')`,
      [pageId, document_id, source_filename, page_number, nextOrder, image_url, thumbnail_url || image_url]
    );

    return { id: pageId, image_url, thumbnail_url, sort_order: nextOrder };
    
  } catch (err: any) {
    console.error(`[Server API ERROR] Exception in /pages/upload:`, err);
    if (err.statusCode) throw err;
    throw createError({ statusCode: 500, statusMessage: err.message || 'Internal Upload Persistence Error' });
  }
});