import { getDb } from '../../utils/db';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const db = getDb();
  
  const updates: string[] = [];
  const values: any[] = [];

  if (body.approval_1_name !== undefined) { updates.push('approval_1_name = ?'); values.push(body.approval_1_name); }
  if (body.approval_1_status !== undefined) { updates.push('approval_1_status = ?'); values.push(body.approval_1_status); }
  if (body.approval_2_name !== undefined) { updates.push('approval_2_name = ?'); values.push(body.approval_2_name); }
  if (body.approval_2_status !== undefined) { updates.push('approval_2_status = ?'); values.push(body.approval_2_status); }
  if (body.manual_html_override !== undefined) { updates.push('manual_html_override = ?'); values.push(body.manual_html_override); }

  if (updates.length > 0) {
    values.push(body.id);
    await db.query(`UPDATE documents SET ${updates.join(', ')} WHERE id = ?`, values);
  }
  
  return { success: true };
});