import { getDb } from '../../utils/db';

export default defineEventHandler(async (event) => {
  const db = getDb();

  try {
    // 1. Gather global diagnostic counts from the DB to surface in the UI
    const [docCountRes]: any = await db.query(`SELECT COUNT(*) as c FROM documents`);
    const [pageCountRes]: any = await db.query(`SELECT COUNT(*) as c FROM pages`);
    const [deletedPageCountRes]: any = await db.query(`SELECT COUNT(*) as c FROM pages WHERE is_deleted = TRUE`);
    
    const stats = {
      totalDocuments: docCountRes[0].c,
      totalPages: pageCountRes[0].c,
      deletedPages: deletedPageCountRes[0].c
    };

    // 2. Fetch the absolute latest document (Single-Project Model)
    const [docs]: any = await db.query(`SELECT * FROM documents ORDER BY created_at DESC LIMIT 1`);
    
    if (!docs || docs.length === 0) {
      return { document: null, pages: [], stats };
    }

    const activeDoc = docs[0];

    // 3. Fetch all active pages for this project
    const [pages]: any = await db.query(`
      SELECT * FROM pages 
      WHERE document_id = ? AND is_deleted = FALSE
      ORDER BY sort_order ASC
    `, [activeDoc.id]);
    
    return { document: activeDoc, pages: pages || [], stats };
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: `DB Fetch Error: ${err.message}` });
  }
});