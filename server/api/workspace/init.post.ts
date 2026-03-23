import { getDb } from '../../utils/db';
import { randomUUID } from 'crypto';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const db = getDb();
  const docId = randomUUID();
  
  await db.query(`INSERT INTO documents (id, filename) VALUES (?, ?)`, [docId, body.filename || 'Assembled Workspace']);
  return { id: docId };
});