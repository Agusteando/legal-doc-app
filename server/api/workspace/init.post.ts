import { getDb } from '../../utils/db';
import { randomUUID } from 'crypto';

export default defineEventHandler(async (event) => {
  console.log(`[Server API] POST /workspace/init - Request received.`);
  
  try {
    const body = await readBody(event);
    const db = getDb();
    const docId = randomUUID();
    const filename = body.filename || 'Assembled Workspace';
    
    console.log(`[Server API] Database connection acquired. Generating document ID: ${docId}`);
    
    await db.query(`INSERT INTO documents (id, filename) VALUES (?, ?)`, [docId, filename]);
    console.log(`[Server API] Successfully inserted document ${docId} into DB.`);
    
    return { id: docId };
  } catch (err: any) {
    console.error(`[Server API ERROR] POST /workspace/init failed:`, err);
    throw createError({ statusCode: 500, statusMessage: `Workspace Init DB Error: ${err.message}` });
  }
});