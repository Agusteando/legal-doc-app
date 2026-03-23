import { getDb } from '../../utils/db';

export default defineEventHandler(async () => {
  const db = getDb();
  const [docs]: any = await db.query(`SELECT * FROM documents ORDER BY created_at DESC LIMIT 1`);
  if (!docs.length) return { document: null, pages: [] };
  
  const doc = docs[0];
  const [pages]: any = await db.query(`
    SELECT * FROM pages 
    WHERE document_id = ? AND is_deleted = FALSE 
    ORDER BY sort_order ASC
  `, [doc.id]);
  
  return { document: doc, pages };
});