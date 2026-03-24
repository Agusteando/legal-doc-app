import { getDb } from '../../utils/db';
import { randomUUID } from 'crypto';

export default defineEventHandler(async (event) => {
  const db = getDb();
  
  try {
    // Single-project enforcement: Find the newest document that actually has pages.
    const [docs]: any = await db.query(`
      SELECT d.id, 
        (SELECT COUNT(*) FROM pages p WHERE p.document_id = d.id AND p.is_deleted = FALSE) as active_page_count
      FROM documents d 
      ORDER BY d.created_at DESC
    `);
    
    if (docs && docs.length > 0) {
      let activeDoc = docs.find((d: any) => d.active_page_count > 0) || docs[0];
      return { id: activeDoc.id };
    }
    
    // Create the global project if the database is completely empty
    const docId = randomUUID();
    await db.query(`INSERT INTO documents (id, filename) VALUES (?, ?)`, [docId, 'Active Legal Project']);
    return { id: docId };
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: `Init Error: ${err.message}` });
  }
});