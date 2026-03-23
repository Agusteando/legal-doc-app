import { getDb } from '../../utils/db';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const db = getDb();
  
  if (body.updates && Array.isArray(body.updates)) {
    // Bulk update sort orders
    for (const u of body.updates) {
      await db.query(`UPDATE pages SET sort_order = ? WHERE id = ?`, [u.sort_order, u.id]);
    }
  } else {
    // Single update
    await db.query(`
      UPDATE pages SET label = ?, rotation = ?, is_excluded = ?, extracted_json = ? WHERE id = ?
    `, [body.label, body.rotation, body.is_excluded, body.extracted_json, body.id]);
  }
  return { success: true };
});