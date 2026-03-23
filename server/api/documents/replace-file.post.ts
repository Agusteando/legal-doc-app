import { getDb } from '../../utils/db';
import { randomUUID } from 'crypto';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { document_id, old_filename, new_filename, new_pages } = body;
  
  const db = getDb();

  // 1. Fetch old pages to inherit their assembly order
  const [oldPagesData]: any = await db.query(
    `SELECT id, sort_order FROM pages WHERE document_id = ? AND source_filename = ? AND is_deleted = FALSE ORDER BY sort_order ASC`,
    [document_id, old_filename]
  );
  
  // 2. Mark old pages as deleted (preserves DB history)
  await db.query(
    `UPDATE pages SET is_deleted = TRUE WHERE document_id = ? AND source_filename = ?`,
    [document_id, old_filename]
  );

  // 3. Insert new pages matching the sort order, marking them 'stale' for review
  let sortOrderIndex = 0;
  let fallbackMaxOrder = 0;
  if (!oldPagesData.length) {
    const [maxRes]: any = await db.query(`SELECT MAX(sort_order) as m FROM pages WHERE document_id = ?`, [document_id]);
    fallbackMaxOrder = maxRes[0].m || 0;
  }

  for (const page of new_pages) {
    let order = 0;
    if (sortOrderIndex < oldPagesData.length) {
      order = oldPagesData[sortOrderIndex].sort_order;
      sortOrderIndex++;
    } else {
      fallbackMaxOrder++;
      order = fallbackMaxOrder;
    }

    const pageId = randomUUID();
    await db.query(
      `INSERT INTO pages (id, document_id, source_filename, page_number, sort_order, image_url, status, is_stale) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending', TRUE)`,
      [pageId, document_id, new_filename, page.page_number, order, page.image_url]
    );
  }

  // 4. Invalidate upstream approvals since source material changed
  await db.query(
    `UPDATE documents SET approval_1_status = NULL, approval_2_status = NULL WHERE id = ?`,
    [document_id]
  );

  return { success: true };
});