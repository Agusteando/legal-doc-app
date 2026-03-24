import { getDb } from '../../utils/db';

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  console.log(`[Server API] GET /workspace/${id} - Request received.`);

  if (!id || id === 'undefined' || id === 'null') {
    console.error(`[Server API ERROR] Invalid Workspace ID parameter: ${id}`);
    throw createError({ statusCode: 400, statusMessage: 'Workspace ID is required and cannot be null' });
  }

  const db = getDb();

  try {
    console.log(`[Server API] Querying document record...`);
    const [docs]: any = await db.query(`SELECT * FROM documents WHERE id = ? LIMIT 1`, [id]);
    
    if (!docs || docs.length === 0) {
      console.warn(`[Server API WARNING] Document ID ${id} not found in database.`);
      throw createError({ statusCode: 404, statusMessage: 'Workspace document not found in database' });
    }

    console.log(`[Server API] Querying page records for doc ${id}...`);
    const [pages]: any = await db.query(`
      SELECT * FROM pages 
      WHERE document_id = ? AND is_deleted = FALSE
      ORDER BY sort_order ASC
    `, [id]);
    
    console.log(`[Server API] Successfully matched 1 document and ${pages?.length || 0} pages.`);
    
    return { document: docs[0], pages: pages || [] };
  } catch (err: any) {
    console.error(`[Server API ERROR] Exception in GET /workspace/${id}:`, err);
    if (err.statusCode) throw err;
    throw createError({ statusCode: 500, statusMessage: `DB Fetch Error: ${err.message}` });
  }
});