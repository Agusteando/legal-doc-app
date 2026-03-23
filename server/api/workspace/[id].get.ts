import { getDb } from '../../utils/db';

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Workspace ID is required' });
  }

  const db = getDb();

  try {
    const [docs]: any = await db.query(`SELECT * FROM documents WHERE id = ? LIMIT 1`, [id]);
    
    if (!docs || docs.length === 0) {
      throw createError({ statusCode: 404, statusMessage: 'Workspace not found' });
    }

    const [pages]: any = await db.query(`
      SELECT * FROM pages 
      WHERE document_id = ? AND is_deleted = FALSE
      ORDER BY sort_order ASC
    `, [id]);

    return { document: docs[0], pages: pages || [] };
  } catch (err: any) {
    console.error("Error fetching workspace:", err.message);
    if (err.statusCode) throw err;
    throw createError({ statusCode: 500, statusMessage: err.message });
  }
});