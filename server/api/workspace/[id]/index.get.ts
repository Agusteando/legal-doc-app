import { getDb } from '../../../utils/db';

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  const db = getDb();

  try {
    const [docs]: any = await db.query(`SELECT * FROM documents WHERE id = ? LIMIT 1`, [id]);
    
    if (!docs.length) {
      return { document: null, pages: [] };
    }

    const [pages]: any = await db.query(`
      SELECT * FROM pages 
      WHERE document_id = ? 
      ORDER BY sort_order ASC
    `, [id]);

    return { document: docs[0], pages: pages };
  } catch (err: any) {
    console.error("Error fetching workspace:", err.message);
    throw createError({ statusCode: 500, statusMessage: err.message });
  }
});