import { getDb } from '../../utils/db';
import { randomUUID } from 'crypto';

export default defineEventHandler(async (event) => {
  const db = getDb();
  
  try {
    // Single-project enforcement: Do we already have an active document?
    const [existing]: any = await db.query(`SELECT * FROM documents ORDER BY created_at DESC LIMIT 1`);
    if (existing && existing.length > 0) {
      return { id: existing[0].id };
    }
    
    // Create the global project if absolutely empty
    const docId = randomUUID();
    await db.query(`INSERT INTO documents (id, filename) VALUES (?, ?)`, [docId, 'Active Legal Project']);
    return { id: docId };
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: `Init Error: ${err.message}` });
  }
});