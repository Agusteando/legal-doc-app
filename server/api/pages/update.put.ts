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
    // Single page field updates
    const updates: string[] = [];
    const values: any[] = [];

    if (body.label !== undefined) { updates.push('label = ?'); values.push(body.label); }
    if (body.notes !== undefined) { updates.push('notes = ?'); values.push(body.notes); }
    if (body.status !== undefined) { updates.push('status = ?'); values.push(body.status); }
    if (body.rotation !== undefined) { updates.push('rotation = ?'); values.push(body.rotation); }
    if (body.is_excluded !== undefined) { updates.push('is_excluded = ?'); values.push(body.is_excluded); }
    if (body.is_deleted !== undefined) { updates.push('is_deleted = ?'); values.push(body.is_deleted); }
    if (body.extracted_json !== undefined) { updates.push('extracted_json = ?'); values.push(body.extracted_json); }
    if (body.source_text !== undefined) { updates.push('source_text = ?'); values.push(body.source_text); }
    if (body.translated_text !== undefined) { updates.push('translated_text = ?'); values.push(body.translated_text); }
    if (body.is_manual_translation !== undefined) { updates.push('is_manual_translation = ?'); values.push(body.is_manual_translation); }
    if (body.is_stale !== undefined) { updates.push('is_stale = ?'); values.push(body.is_stale); }
    if (body.manual_html_override !== undefined) { updates.push('manual_html_override = ?'); values.push(body.manual_html_override); }

    if (updates.length > 0) {
      values.push(body.id);
      await db.query(`UPDATE pages SET ${updates.join(', ')} WHERE id = ?`, values);
    }
  }
  return { success: true };
});