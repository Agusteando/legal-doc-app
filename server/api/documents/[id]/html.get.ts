import { getDb } from '../../../utils/db';
import { renderLayoutBlock } from '../../../../utils/renderer';

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  const db = getDb();

  const [docs]: any = await db.query(`SELECT manual_html_override FROM documents WHERE id = ? LIMIT 1`, [id]);
  if (!docs.length) throw createError({ statusCode: 404, statusMessage: 'Document not found.' });

  // 1. Compute the deterministic HTML from the current JSON pages
  const [pages]: any = await db.query(`
    SELECT extracted_json FROM pages 
    WHERE document_id = ? AND is_deleted = FALSE AND is_excluded = FALSE 
    ORDER BY sort_order ASC
  `, [id]);

  let computedHtml = '';
  for (const page of pages) {
    if (page.extracted_json) {
      try {
        const data = JSON.parse(page.extracted_json);
        if (data.layout_blocks && Array.isArray(data.layout_blocks)) {
          data.layout_blocks.forEach((block: any) => computedHtml += renderLayoutBlock(block));
        }
        computedHtml += '<div class="page-break" style="page-break-after: always;"></div>\n';
      } catch (e) {
        console.warn("Skipped invalid JSON block during compile");
      }
    }
  }

  // 2. Determine state: Are we serving the auto-assembly, or a manual override?
  const manualOverride = docs[0].manual_html_override;

  return { 
    is_override: !!manualOverride,
    html: manualOverride || computedHtml || '<p style="color:#94a3b8; font-style:italic; text-align:center; padding-top: 2rem;">No extracted page data found yet. Process pages to begin document assembly.</p>',
    computed_html: computedHtml
  };
});