import { getDb } from '../../utils/db';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const db = getDb();
  
  await db.query(`
    UPDATE documents SET 
      approval_1_name = ?, approval_1_status = ?, 
      approval_2_name = ?, approval_2_status = ? 
    WHERE id = ?
  `, [
    body.approval_1_name, body.approval_1_status, 
    body.approval_2_name, body.approval_2_status, 
    body.id
  ]);
  
  return { success: true };
});