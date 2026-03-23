import { getDb } from '../../../utils/db';
// FIX: 4 levels up to reach the root /utils folder
import { renderLayoutBlock } from '../../../../utils/renderer';

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  const db = getDb();

  const [docs]: any = await db.query(`SELECT manual_html_override FROM documents WHERE id = ? LIMIT 1`, [id]);
  if (!docs.length) throw createError({ statusCode: 404, statusMessage: 'Document not found.' });

  // If user already saved a manual WYSIWYG override, return it.
  if (docs[0].manual_html_override) {
    return { html: docs[0].manual_html_override };
  }

  // Otherwise, compile fresh deterministic HTML from JSON pages
  const [pages]: any = await db.query(`
    SELECT extracted_json FROM pages 
    WHERE document_id = ? AND is_deleted = FALSE AND is_excluded = FALSE 
    ORDER BY sort_order ASC
  `, [id]);

  let innerHtml = '';
  for (const page of pages) {
    if (page.extracted_json) {
      try {
        const data = JSON.parse(page.extracted_json);
        if (data.layout_blocks && Array.isArray(data.layout_blocks)) {
          data.layout_blocks.forEach((block: any) => innerHtml += renderLayoutBlock(block));
        }
        innerHtml += '<div class="page-break" style="page-break-after: always;"></div>\n';
      } catch (e) {
        console.warn("Skipped invalid JSON block during compile");
      }
    }
  }

  return { html: innerHtml };
});